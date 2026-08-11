import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import * as whatsapp from "../channels/whatsapp.js";
import * as meta from "../channels/meta.js";

/**
 * Canais / Conexões — MULTICANAL e MULTI-CONEXÃO.
 *
 * Uma empresa pode ter várias conexões, de tipos diferentes: vários números de
 * WhatsApp, Instagram, Facebook, Telegram, Widget do site e E-mail. Cada conexão
 * é uma linha em `channels` com status próprio.
 *
 * WhatsApp é conexão REAL (Baileys, QR). Os demais canais têm o encaixe pronto
 * (linha, status e configuração) — a integração com o provedor entra por cima
 * quando as credenciais forem informadas.
 */

// Catálogo de tipos de canal que o painel oferece para adicionar.
const CHANNEL_CATALOG = [
  {
    type: "whatsapp",
    label: "WhatsApp",
    icon: "🟢",
    real: true,
    help: "Conecte um número via QR Code (Baileys).",
  },
  {
    type: "instagram",
    label: "Instagram Direct",
    icon: "📸",
    real: true,
    help: "Conta profissional ligada a uma página. Informe o ID da conta, o ID da página e o token da página.",
  },
  {
    type: "facebook",
    label: "Facebook Messenger",
    icon: "💬",
    real: true,
    help: "Mensagens da página. Informe o ID da página e o token de acesso da página.",
  },
  {
    type: "telegram",
    label: "Telegram",
    icon: "✈️",
    real: false,
    help: "Bot do Telegram. Requer o token do @BotFather.",
  },
  {
    type: "widget",
    label: "Widget do site",
    icon: "🌐",
    real: true,
    help: "Chat do site — já ativo por padrão.",
  },
  {
    type: "email",
    label: "E-mail",
    icon: "✉️",
    real: false,
    help: "Caixa de e-mail (IMAP/SMTP). Requer credenciais do servidor.",
  },
] as const;
const TYPES = CHANNEL_CATALOG.map((c) => c.type) as [string, ...string[]];

export async function channelRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Lista as conexões da empresa (mescla o status ao vivo do WhatsApp).
  app.get("/channels", async (req) => {
    const rows = await db
      .select()
      .from(schema.channels)
      .where(eq(schema.channels.companyId, req.principal.companyId))
      .orderBy(asc(schema.channels.createdAt));
    const data = rows.map((r) => {
      if (r.type === "whatsapp") {
        const live = whatsapp.status(r.id);
        return { ...r, status: live.status !== "disconnected" ? live.status : r.status, live };
      }
      return r;
    });
    return { data, catalog: CHANNEL_CATALOG };
  });

  // Cria uma nova conexão. (admin)
  app.post("/channels", { preHandler: requireAdmin }, async (req, reply) => {
    const { type, name } = parse(
      z.object({ type: z.enum(TYPES), name: z.string().min(1).max(128).optional() }),
      req.body
    );
    const meta = CHANNEL_CATALOG.find((c) => c.type === type)!;
    // Widget do site já nasce "conectado" (o chat do site está sempre ativo).
    const status = type === "widget" ? "connected" : "disconnected";
    const [row] = await db
      .insert(schema.channels)
      .values({
        companyId: req.principal.companyId,
        type,
        name: name?.trim() || meta.label,
        status,
      })
      .returning();
    audit(req.principal, "channel.create", "channel", row.id);
    return reply.code(201).send(row);
  });

  // Renomeia / salva configuração de uma conexão. (admin)
  app.patch("/channels/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(
      z.object({
        name: z.string().min(1).max(128).optional(),
        config: z.record(z.any()).optional(),
      }),
      req.body
    );
    const [row] = await db
      .update(schema.channels)
      .set(body)
      .where(
        and(eq(schema.channels.id, id), eq(schema.channels.companyId, req.principal.companyId))
      )
      .returning();
    if (!row) throw new ApiError(404, "Conexão não encontrada");
    return row;
  });

  // Remove uma conexão. (admin) — encerra a sessão de WhatsApp se houver.
  app.delete("/channels/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .select()
      .from(schema.channels)
      .where(
        and(eq(schema.channels.id, id), eq(schema.channels.companyId, req.principal.companyId))
      );
    if (!row) throw new ApiError(404, "Conexão não encontrada");
    if (row.type === "whatsapp") await whatsapp.disconnect(id).catch(() => {});
    await db.delete(schema.channels).where(eq(schema.channels.id, id));
    audit(req.principal, "channel.delete", "channel", id);
    return reply.code(204).send();
  });

  // Busca a conexão garantindo que é da empresa.
  async function own(companyId: string, id: string) {
    const [row] = await db
      .select()
      .from(schema.channels)
      .where(and(eq(schema.channels.id, id), eq(schema.channels.companyId, companyId)));
    if (!row) throw new ApiError(404, "Conexão não encontrada");
    return row;
  }

  // Conecta uma conexão. (admin)
  app.post("/channels/:id/connect", { preHandler: requireAdmin }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const row = await own(req.principal.companyId, id);
    audit(req.principal, "channel.connect", "channel", id);
    if (row.type === "whatsapp") return whatsapp.connect(id);
    if (row.type === "widget") {
      await db
        .update(schema.channels)
        .set({ status: "connected" })
        .where(eq(schema.channels.id, id));
      return { status: "connected" as const };
    }
    const cfg = (row.config as Record<string, unknown>) || {};
    if (!Object.keys(cfg).length) {
      throw new ApiError(400, "Configure as credenciais desta conexão antes de conectar.");
    }

    // Instagram/Messenger: integração real. Só marcamos "connected" depois que a
    // Graph API aceita o token — senão o painel mostraria verde para uma conexão
    // que não entrega mensagem nenhuma.
    if (meta.isMetaType(row.type)) {
      const parsed = meta.MetaConfig.safeParse(cfg);
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? "Credenciais incompletas");
      }
      if (!meta.appSecretDe(parsed.data)) {
        throw new ApiError(
          400,
          "Falta o App Secret da Meta: defina META_APP_SECRET na API ou informe appSecret nesta conexão."
        );
      }
      const teste = await meta.testarCredenciais(parsed.data);
      if (!teste.ok) throw new ApiError(400, teste.erro);
      await db
        .update(schema.channels)
        .set({ status: "connected" })
        .where(eq(schema.channels.id, id));
      return { status: "connected" as const, page: teste.nome };
    }

    // Demais canais: encaixe pronto, sem integração real ainda.
    await db
      .update(schema.channels)
      .set({ status: "configured" })
      .where(eq(schema.channels.id, id));
    return {
      status: "configured" as const,
      note: "Configuração salva. A integração do provedor entra por cima.",
    };
  });

  // Status de uma conexão (o painel faz polling nas de WhatsApp).
  app.get("/channels/:id/status", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const row = await own(req.principal.companyId, id);
    if (row.type === "whatsapp")
      return { ...whatsapp.status(id), contactsAvailable: whatsapp.contactsCount(id) };
    return { status: row.status, qr: null, phone: (row.config as any)?.phone ?? null };
  });

  // Sincroniza a agenda do aparelho conectado para os Contatos da empresa. (admin)
  app.post("/channels/:id/sync-contacts", { preHandler: requireAdmin }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const row = await own(req.principal.companyId, id);
    if (row.type !== "whatsapp")
      throw new ApiError(400, "Sincronização de agenda só está disponível no WhatsApp.");
    const res = await whatsapp.syncContacts(id);
    if (!res.ok) throw new ApiError(409, res.error || "Não foi possível sincronizar");
    audit(req.principal, "channel.sync_contacts", "channel", id, {
      imported: res.imported,
      skipped: res.skipped,
    });
    return res;
  });

  // Desconecta uma conexão. (admin)
  app.post("/channels/:id/disconnect", { preHandler: requireAdmin }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const row = await own(req.principal.companyId, id);
    audit(req.principal, "channel.disconnect", "channel", id);
    if (row.type === "whatsapp") return whatsapp.disconnect(id);
    await db
      .update(schema.channels)
      .set({ status: "disconnected" })
      .where(eq(schema.channels.id, id));
    return { status: "disconnected" as const };
  });
}
