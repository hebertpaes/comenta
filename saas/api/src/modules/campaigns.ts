import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq, sql as dsql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";
import { audit } from "../lib/audit.js";

/**
 * Campanhas (Lote 3) — disparo de mensagens para listas de contatos, na hora ou
 * agendado.
 *
 * Fluxo:
 *   1. Cria a campanha escolhendo o público (todos os contatos, por tag, ou
 *      uma lista explícita de contatos). Só entram contatos COM telefone.
 *   2. Envia agora (POST /:id/send) ou agenda (scheduledAt) — o agendador
 *      dispara quando a hora chega.
 *   3. Cada destinatário recebe a mensagem: registramos uma mensagem de saída na
 *      conversa do contato (aparece no painel) e entregamos no WhatsApp se
 *      houver uma conexão conectada. Status por destinatário (enviado/falhou).
 *
 * A mensagem aceita a variável {nome} (ou {name}), trocada pelo nome do contato.
 */

// Campanhas em execução no processo (evita disparo duplicado pelo agendador).
const inFlight = new Set<string>();

// Intervalo entre envios (anti-bloqueio do WhatsApp). Configurável por env.
const SEND_GAP_MS = Number(process.env.CAMPAIGN_SEND_GAP_MS || 700);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function render(template: string, contact: { name: string }): string {
  const first = (contact.name || "").trim().split(/\s+/)[0] || contact.name || "";
  return template
    .replace(/\{nome\}/gi, contact.name || "")
    .replace(/\{name\}/gi, contact.name || "")
    .replace(/\{primeiro_?nome\}/gi, first)
    .replace(/\{firstname\}/gi, first);
}

// Registra a mensagem de saída na conversa do contato (cria a conversa se não
// houver uma aberta) e tenta entregar no WhatsApp. Lança em caso de falha grave.
async function deliverToContact(companyId: string, contactId: string, body: string) {
  let [conv] = await db
    .select()
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.companyId, companyId),
        eq(schema.conversations.contactId, contactId),
        dsql`${schema.conversations.status} <> 'resolved'`
      )
    )
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(1);
  let created = false;
  if (!conv) {
    [conv] = await db
      .insert(schema.conversations)
      .values({ companyId, contactId, status: "open", unreadCount: 0, lastMessageAt: new Date() })
      .returning();
    created = true;
  }

  const [msg] = await db
    .insert(schema.messages)
    .values({ companyId, conversationId: conv.id, direction: "out", body })
    .returning();
  await db
    .update(schema.conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(schema.conversations.id, conv.id));

  if (created) {
    emitToCompany(companyId, "conversation.created", { conversation: conv });
    publishEvent(companyId, "conversation.created", { conversation: conv }).catch(() => {});
  }
  emitToCompany(companyId, "message.created", { conversationId: conv.id, message: msg });
  publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(
    () => {}
  );

  // Entrega no WhatsApp (best-effort): se não houver conexão, a mensagem fica
  // registrada na conversa mesmo assim. Import dinâmico evita ciclo de módulo.
  await import("../channels/whatsapp.js")
    .then((m) => m.sendToContact(companyId, contactId, body))
    .catch(() => false);
}

/** Executa uma campanha: percorre os destinatários pendentes e envia. */
export async function runCampaign(campaignId: string) {
  if (inFlight.has(campaignId)) return;
  inFlight.add(campaignId);
  try {
    const [camp] = await db
      .select()
      .from(schema.campaigns)
      .where(eq(schema.campaigns.id, campaignId));
    if (!camp || camp.status === "canceled" || camp.status === "done") return;

    await db
      .update(schema.campaigns)
      .set({ status: "running", startedAt: camp.startedAt ?? new Date() })
      .where(eq(schema.campaigns.id, campaignId));
    emitToCompany(camp.companyId, "campaign.updated", { id: campaignId, status: "running" });

    const recipients = await db
      .select({
        id: schema.campaignRecipients.id,
        contactId: schema.campaignRecipients.contactId,
      })
      .from(schema.campaignRecipients)
      .where(
        and(
          eq(schema.campaignRecipients.campaignId, campaignId),
          eq(schema.campaignRecipients.status, "pending")
        )
      );

    let sent = camp.sent;
    let failed = camp.failed;

    for (const r of recipients) {
      // Respeita cancelamento no meio do disparo.
      const [fresh] = await db
        .select({ status: schema.campaigns.status })
        .from(schema.campaigns)
        .where(eq(schema.campaigns.id, campaignId));
      if (!fresh || fresh.status === "canceled") break;

      const [contact] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, r.contactId));
      try {
        if (!contact?.phone) throw new Error("contato sem telefone");
        const body = render(camp.message, { name: contact.name });
        await deliverToContact(camp.companyId, contact.id, body);
        await db
          .update(schema.campaignRecipients)
          .set({ status: "sent", sentAt: new Date(), error: null })
          .where(eq(schema.campaignRecipients.id, r.id));
        sent++;
      } catch (e) {
        await db
          .update(schema.campaignRecipients)
          .set({ status: "failed", error: (e as Error).message.slice(0, 240) })
          .where(eq(schema.campaignRecipients.id, r.id));
        failed++;
      }

      await db
        .update(schema.campaigns)
        .set({ sent, failed })
        .where(eq(schema.campaigns.id, campaignId));
      emitToCompany(camp.companyId, "campaign.progress", {
        id: campaignId,
        sent,
        failed,
        total: camp.total,
      });
      if (SEND_GAP_MS > 0) await sleep(SEND_GAP_MS);
    }

    const [after] = await db
      .select({ status: schema.campaigns.status })
      .from(schema.campaigns)
      .where(eq(schema.campaigns.id, campaignId));
    if (after && after.status !== "canceled") {
      await db
        .update(schema.campaigns)
        .set({ status: "done", finishedAt: new Date() })
        .where(eq(schema.campaigns.id, campaignId));
      emitToCompany(camp.companyId, "campaign.updated", {
        id: campaignId,
        status: "done",
        sent,
        failed,
      });
    }
  } finally {
    inFlight.delete(campaignId);
  }
}

/** Agendador: a cada minuto dispara campanhas agendadas cuja hora chegou e
 *  retoma campanhas que ficaram "running" (ex.: reinício do processo). */
export function startCampaignScheduler() {
  const tick = async () => {
    try {
      const now = new Date();
      const due = await db
        .select({ id: schema.campaigns.id, scheduledAt: schema.campaigns.scheduledAt })
        .from(schema.campaigns)
        .where(eq(schema.campaigns.status, "scheduled"));
      for (const c of due) {
        if (c.scheduledAt && c.scheduledAt <= now) runCampaign(c.id).catch(() => {});
      }
      // Retoma execuções interrompidas.
      const stuck = await db
        .select({ id: schema.campaigns.id })
        .from(schema.campaigns)
        .where(eq(schema.campaigns.status, "running"));
      for (const c of stuck) if (!inFlight.has(c.id)) runCampaign(c.id).catch(() => {});
    } catch {
      /* silencioso — próxima passada tenta de novo */
    }
  };
  setInterval(tick, 60_000);
  // Primeira passada logo após o boot (retoma agendadas/running perdidas).
  setTimeout(() => tick().catch(() => {}), 8_000);
}

// Monta a lista de contatos (com telefone) a partir do público escolhido.
async function resolveAudience(
  companyId: string,
  opts: { tag?: string; contactIds?: string[]; all?: boolean }
): Promise<{ id: string }[]> {
  const rows = await db
    .select({ id: schema.contacts.id, phone: schema.contacts.phone, tags: schema.contacts.tags })
    .from(schema.contacts)
    .where(eq(schema.contacts.companyId, companyId));
  let list = rows.filter((c) => (c.phone || "").replace(/\D/g, "").length >= 8);
  if (opts.contactIds && opts.contactIds.length) {
    const set = new Set(opts.contactIds);
    list = list.filter((c) => set.has(c.id));
  } else if (opts.tag) {
    const tag = opts.tag.toLowerCase();
    list = list.filter((c) => (c.tags || []).some((t) => String(t).toLowerCase() === tag));
  } // else: all
  return list.map((c) => ({ id: c.id }));
}

async function withCounts(companyId: string) {
  const rows = await db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.companyId, companyId))
    .orderBy(desc(schema.campaigns.createdAt));
  return rows;
}

export async function campaignRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireAdmin);

  // Lista as tags disponíveis (para montar o público) + campanhas da empresa.
  app.get("/campaigns", async (req) => {
    const p = req.principal;
    const [rows, contactsRows] = await Promise.all([
      withCounts(p.companyId),
      db
        .select({ tags: schema.contacts.tags, phone: schema.contacts.phone })
        .from(schema.contacts)
        .where(eq(schema.contacts.companyId, p.companyId)),
    ]);
    const tagCounts: Record<string, number> = {};
    let withPhone = 0;
    for (const c of contactsRows) {
      const hasPhone = (c.phone || "").replace(/\D/g, "").length >= 8;
      if (hasPhone) withPhone++;
      for (const t of c.tags || []) {
        const key = String(t);
        if (hasPhone) tagCounts[key] = (tagCounts[key] || 0) + 1;
      }
    }
    return { data: rows, audience: { totalWithPhone: withPhone, tags: tagCounts } };
  });

  // Detalhe + destinatários.
  app.get("/campaigns/:id", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const p = req.principal;
    const [camp] = await db
      .select()
      .from(schema.campaigns)
      .where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.companyId, p.companyId)));
    if (!camp) throw new ApiError(404, "Campanha não encontrada");
    const recipients = await db
      .select({
        id: schema.campaignRecipients.id,
        status: schema.campaignRecipients.status,
        error: schema.campaignRecipients.error,
        sentAt: schema.campaignRecipients.sentAt,
        contactName: schema.contacts.name,
        contactPhone: schema.contacts.phone,
      })
      .from(schema.campaignRecipients)
      .leftJoin(schema.contacts, eq(schema.contacts.id, schema.campaignRecipients.contactId))
      .where(eq(schema.campaignRecipients.campaignId, id))
      .orderBy(asc(schema.campaignRecipients.status));
    return { ...camp, recipients };
  });

  // Cria a campanha (rascunho, ou agendada se vier scheduledAt).
  app.post("/campaigns", async (req, reply) => {
    const body = parse(
      z.object({
        name: z.string().min(1).max(160),
        message: z.string().min(1).max(4096),
        audience: z.enum(["all", "tag", "contacts"]).default("all"),
        tag: z.string().max(64).optional(),
        contactIds: z.array(z.string().uuid()).max(5000).optional(),
        scheduledAt: z.string().datetime({ offset: true }).optional(),
      }),
      req.body
    );
    const p = req.principal;

    const audience = await resolveAudience(p.companyId, {
      all: body.audience === "all",
      tag: body.audience === "tag" ? body.tag : undefined,
      contactIds: body.audience === "contacts" ? body.contactIds : undefined,
    });
    if (!audience.length)
      throw new ApiError(400, "Nenhum contato com telefone no público selecionado.");

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (scheduledAt && scheduledAt.getTime() < Date.now() - 60_000) {
      throw new ApiError(400, "A data de agendamento precisa estar no futuro.");
    }
    const status = scheduledAt ? "scheduled" : "draft";

    const [camp] = await db
      .insert(schema.campaigns)
      .values({
        companyId: p.companyId,
        name: body.name.trim(),
        message: body.message,
        status,
        filterTag: body.audience === "tag" ? (body.tag ?? null) : null,
        scheduledAt,
        total: audience.length,
        createdByUserId: p.userId ?? null,
      })
      .returning();

    await db
      .insert(schema.campaignRecipients)
      .values(
        audience.map((a) => ({ campaignId: camp.id, companyId: p.companyId, contactId: a.id }))
      );

    audit(p, "campaign.created", "campaign", camp.id, { total: audience.length, status });
    return reply.code(201).send(camp);
  });

  // Dispara agora (draft ou scheduled → running).
  app.post("/campaigns/:id/send", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const p = req.principal;
    const [camp] = await db
      .select()
      .from(schema.campaigns)
      .where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.companyId, p.companyId)));
    if (!camp) throw new ApiError(404, "Campanha não encontrada");
    if (camp.status === "running") return { status: "running" };
    if (camp.status === "done") throw new ApiError(409, "Campanha já foi concluída.");
    audit(p, "campaign.send", "campaign", id);
    runCampaign(id).catch(() => {});
    return { status: "running" };
  });

  // Cancela (para o disparo em andamento e não agenda mais).
  app.post("/campaigns/:id/cancel", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const p = req.principal;
    const [camp] = await db
      .update(schema.campaigns)
      .set({ status: "canceled", finishedAt: new Date() })
      .where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.companyId, p.companyId)))
      .returning();
    if (!camp) throw new ApiError(404, "Campanha não encontrada");
    emitToCompany(p.companyId, "campaign.updated", { id, status: "canceled" });
    audit(p, "campaign.cancel", "campaign", id);
    return camp;
  });

  // Remove.
  app.delete("/campaigns/:id", async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const p = req.principal;
    const [camp] = await db
      .delete(schema.campaigns)
      .where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.companyId, p.companyId)))
      .returning();
    if (!camp) throw new ApiError(404, "Campanha não encontrada");
    audit(p, "campaign.deleted", "campaign", id);
    return reply.code(204).send();
  });
}
