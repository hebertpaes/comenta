import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";

/**
 * Automações / bot de fluxo. Regras que respondem ou roteiam a conversa sozinhas,
 * rodando quando chega uma mensagem do cliente (inbound). Tipos:
 *   - welcome        : responde na 1ª mensagem da conversa
 *   - business_hours : responde quando está FORA do horário de atendimento
 *   - keyword        : responde quando a mensagem contém palavras-chave
 */

const TYPES = ["welcome", "business_hours", "keyword"] as const;

type Conv = { id: string; contactId: string };

// Posta uma resposta automática (do "bot") na conversa: aparece no painel e no
// chat do site, e vai para o WhatsApp do cliente se o canal estiver conectado.
async function botReply(companyId: string, conv: Conv, body: string) {
  const [msg] = await db
    .insert(schema.messages)
    .values({ companyId, conversationId: conv.id, direction: "out", body })
    .returning();
  await db
    .update(schema.conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(schema.conversations.id, conv.id));
  emitToCompany(companyId, "message.created", { conversationId: conv.id, message: msg });
  publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(() => {});
  // entrega no WhatsApp (import dinâmico evita ciclo com channels/whatsapp)
  import("../channels/whatsapp.js")
    .then((m) => m.sendToContact(companyId, conv.contactId, body))
    .catch(() => {});
}

function withinBusinessHours(cfg: Record<string, unknown>): boolean {
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay(); // 1=seg … 7=dom
  const days = Array.isArray(cfg.days) && cfg.days.length ? (cfg.days as number[]) : [1, 2, 3, 4, 5];
  if (!days.includes(day)) return false;
  const [sh, sm] = String(cfg.start ?? "09:00").split(":").map(Number);
  const [eh, em] = String(cfg.end ?? "18:00").split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= sh * 60 + sm && mins < eh * 60 + em;
}

/** Roda as automações ativas da empresa para uma mensagem recebida. */
export async function applyAutomations(
  companyId: string,
  conv: Conv,
  text: string,
  firstMessage: boolean
): Promise<void> {
  const rules = await db
    .select()
    .from(schema.automations)
    .where(and(eq(schema.automations.companyId, companyId), eq(schema.automations.isActive, true)))
    .catch(() => [] as (typeof schema.automations.$inferSelect)[]);
  const l = (text || "").toLowerCase();
  for (const r of rules) {
    const cfg = r.config as Record<string, unknown>;
    try {
      if (r.type === "welcome" && firstMessage && cfg.message) {
        await botReply(companyId, conv, String(cfg.message));
      } else if (r.type === "business_hours" && firstMessage && cfg.message && !withinBusinessHours(cfg)) {
        await botReply(companyId, conv, String(cfg.message));
      } else if (r.type === "keyword" && Array.isArray(cfg.keywords) && cfg.reply) {
        const hit = (cfg.keywords as unknown[]).some((k) => l.includes(String(k).toLowerCase()));
        if (hit) await botReply(companyId, conv, String(cfg.reply));
      }
    } catch {
      /* uma regra que falha não derruba as outras */
    }
  }
}

export async function automationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireAdmin);

  app.get("/automations", async (req) => {
    const rows = await db
      .select()
      .from(schema.automations)
      .where(eq(schema.automations.companyId, req.principal.companyId));
    return { data: rows, types: TYPES };
  });

  app.post("/automations", async (req, reply) => {
    const body = parse(
      z.object({
        name: z.string().min(1).max(120),
        type: z.enum(TYPES),
        config: z.record(z.any()).default({}),
        isActive: z.boolean().default(true),
      }),
      req.body
    );
    const [row] = await db
      .insert(schema.automations)
      .values({ companyId: req.principal.companyId, ...body })
      .returning();
    return reply.code(201).send(row);
  });

  app.patch("/automations/:id", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(
      z.object({
        name: z.string().min(1).max(120).optional(),
        config: z.record(z.any()).optional(),
        isActive: z.boolean().optional(),
      }),
      req.body
    );
    const [row] = await db
      .update(schema.automations)
      .set(body)
      .where(and(eq(schema.automations.id, id), eq(schema.automations.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Automação não encontrada");
    return row;
  });

  app.delete("/automations/:id", async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .delete(schema.automations)
      .where(and(eq(schema.automations.id, id), eq(schema.automations.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Automação não encontrada");
    return reply.code(204).send();
  });
}
