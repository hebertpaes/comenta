import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq, inArray, sql as dsql } from "drizzle-orm";
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

// Intervalo padrão entre envios (fallback quando a campanha não define nada).
const SEND_GAP_MS = Number(process.env.CAMPAIGN_SEND_GAP_MS || 700);

// Configuração de disparo padrão (anti-bloqueio). Valores conservadores: pausa
// aleatória entre mensagens, lotes com descanso, e ordem embaralhada.
export const DEFAULT_DISPATCH = {
  minSec: 5,          // intervalo mínimo entre mensagens (segundos)
  maxSec: 15,         // intervalo máximo — o real é sorteado entre min e max
  batchSize: 30,      // envia em lotes de N; 0 desliga o lote
  batchPauseMin: 3,   // descanso entre lotes (minutos)
  dailyLimit: 0,      // teto de envios por dia; 0 = sem limite
  businessOnly: false, // só dispara dentro do horário comercial
  start: "08:00",     // início do horário comercial
  end: "18:00",       // fim do horário comercial
  shuffle: true,      // embaralha a ordem dos destinatários
};
type Dispatch = typeof DEFAULT_DISPATCH;

// Schema Zod para o corpo (todos opcionais; merge com o padrão).
const DispatchSchema = z
  .object({
    minSec: z.number().int().min(0).max(3600),
    maxSec: z.number().int().min(0).max(7200),
    batchSize: z.number().int().min(0).max(100000),
    batchPauseMin: z.number().int().min(0).max(1440),
    dailyLimit: z.number().int().min(0).max(1000000),
    businessOnly: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    shuffle: z.boolean(),
  })
  .partial();

// Normaliza a config salva na campanha, aplicando defaults e sanidade.
function dispatchOf(camp: { dispatch?: unknown }): Dispatch {
  const d = { ...DEFAULT_DISPATCH, ...((camp.dispatch as Partial<Dispatch>) || {}) };
  if (d.maxSec < d.minSec) d.maxSec = d.minSec; // evita intervalo invertido
  return d;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Embaralha uma lista (Fisher-Yates) — para não disparar sempre na mesma ordem.
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Minutos desde a meia-noite para "HH:MM".
function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

// Está dentro do horário comercial agora? (janela simples HH:MM–HH:MM, todo dia)
function withinBusiness(d: Dispatch, now = new Date()): boolean {
  if (!d.businessOnly) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  const a = hhmmToMin(d.start);
  const b = hhmmToMin(d.end);
  return a <= b ? cur >= a && cur < b : cur >= a || cur < b; // suporta janela que vira a meia-noite
}

// Próximo horário de abertura da janela comercial (para reagendar).
function nextBusinessOpen(d: Dispatch, now = new Date()): Date {
  const open = new Date(now);
  const [h, m] = d.start.split(":").map((n) => parseInt(n, 10));
  open.setHours(h || 0, m || 0, 0, 0);
  if (open.getTime() <= now.getTime()) open.setDate(open.getDate() + 1);
  return open;
}

// Início do próximo dia (para reagendar após bater o limite diário).
function startOfTomorrow(now = new Date()): Date {
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  t.setHours(0, 5, 0, 0);
  return t;
}

// Coloca a campanha de volta na fila para retomar mais tarde (limite/horário).
async function rescheduleCampaign(campaignId: string, companyId: string, when: Date, sent: number, failed: number) {
  await db
    .update(schema.campaigns)
    .set({ status: "scheduled", scheduledAt: when, sent, failed })
    .where(eq(schema.campaigns.id, campaignId));
  emitToCompany(companyId, "campaign.updated", { id: campaignId, status: "scheduled", resumeAt: when.toISOString() });
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
async function deliverToContact(
  companyId: string,
  contactId: string,
  body: string,
  media?: { url: string; type: "image" | "file" }
) {
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
    .values({
      companyId,
      conversationId: conv.id,
      direction: "out",
      body,
      contentType: media ? media.type : "text",
      mediaUrl: media?.url ?? null,
    })
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
  publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(() => {});

  // Entrega no WhatsApp (best-effort): se não houver conexão, a mensagem fica
  // registrada na conversa mesmo assim. Import dinâmico evita ciclo de módulo.
  await import("../channels/whatsapp.js")
    .then((m) => m.sendToContact(companyId, contactId, body, media))
    .catch(() => false);
}

/** Executa uma campanha: percorre os destinatários pendentes e envia. */
export async function runCampaign(campaignId: string) {
  if (inFlight.has(campaignId)) return;
  inFlight.add(campaignId);
  try {
    const [camp] = await db.select().from(schema.campaigns).where(eq(schema.campaigns.id, campaignId));
    if (!camp || camp.status === "canceled" || camp.status === "done") return;

    await db
      .update(schema.campaigns)
      .set({ status: "running", startedAt: camp.startedAt ?? new Date() })
      .where(eq(schema.campaigns.id, campaignId));
    emitToCompany(camp.companyId, "campaign.updated", { id: campaignId, status: "running" });

    const d = dispatchOf(camp);

    // Fora do horário comercial no arranque → reagenda para a próxima abertura.
    if (!withinBusiness(d)) {
      await rescheduleCampaign(campaignId, camp.companyId, nextBusinessOpen(d), camp.sent, camp.failed);
      return;
    }

    let recipients = await db
      .select({ id: schema.campaignRecipients.id, contactId: schema.campaignRecipients.contactId })
      .from(schema.campaignRecipients)
      .where(and(eq(schema.campaignRecipients.campaignId, campaignId), eq(schema.campaignRecipients.status, "pending")));
    if (d.shuffle) recipients = shuffle(recipients);

    // Quantos já foram enviados hoje (para respeitar o limite diário).
    let sentToday = 0;
    if (d.dailyLimit > 0) {
      const [row] = await db
        .select({ n: dsql<number>`count(*)::int` })
        .from(schema.campaignRecipients)
        .where(
          and(
            eq(schema.campaignRecipients.campaignId, campaignId),
            eq(schema.campaignRecipients.status, "sent"),
            dsql`${schema.campaignRecipients.sentAt} >= date_trunc('day', now())`
          )
        );
      sentToday = row?.n ?? 0;
    }

    let sent = camp.sent;
    let failed = camp.failed;
    let inBatch = 0;

    for (const r of recipients) {
      // Respeita cancelamento no meio do disparo.
      const [fresh] = await db
        .select({ status: schema.campaigns.status })
        .from(schema.campaigns)
        .where(eq(schema.campaigns.id, campaignId));
      if (!fresh || fresh.status === "canceled") break;

      // Saiu do horário comercial → pausa e retoma na próxima abertura.
      if (!withinBusiness(d)) {
        await rescheduleCampaign(campaignId, camp.companyId, nextBusinessOpen(d), sent, failed);
        return;
      }
      // Bateu o limite diário → retoma amanhã.
      if (d.dailyLimit > 0 && sentToday >= d.dailyLimit) {
        await rescheduleCampaign(campaignId, camp.companyId, startOfTomorrow(), sent, failed);
        return;
      }

      const [contact] = await db.select().from(schema.contacts).where(eq(schema.contacts.id, r.contactId));
      try {
        if (!contact?.phone) throw new Error("contato sem telefone");
        const body = render(camp.message, { name: contact.name });
        const media = camp.mediaUrl
          ? { url: camp.mediaUrl, type: (camp.mediaType === "file" ? "file" : "image") as "image" | "file" }
          : undefined;
        await deliverToContact(camp.companyId, contact.id, body, media);
        await db
          .update(schema.campaignRecipients)
          .set({ status: "sent", sentAt: new Date(), error: null })
          .where(eq(schema.campaignRecipients.id, r.id));
        sent++; sentToday++; inBatch++;
      } catch (e) {
        await db
          .update(schema.campaignRecipients)
          .set({ status: "failed", error: (e as Error).message.slice(0, 240) })
          .where(eq(schema.campaignRecipients.id, r.id));
        failed++;
      }

      await db.update(schema.campaigns).set({ sent, failed }).where(eq(schema.campaigns.id, campaignId));
      emitToCompany(camp.companyId, "campaign.progress", { id: campaignId, sent, failed, total: camp.total });

      // Descanso entre lotes; senão, intervalo aleatório entre mensagens.
      if (d.batchSize > 0 && inBatch >= d.batchSize) {
        inBatch = 0;
        await sleep(d.batchPauseMin * 60_000);
      } else {
        const lo = d.minSec * 1000;
        const hi = d.maxSec * 1000;
        const wait = hi > lo ? lo + Math.floor(Math.random() * (hi - lo)) : lo || SEND_GAP_MS;
        if (wait > 0) await sleep(wait);
      }
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
      emitToCompany(camp.companyId, "campaign.updated", { id: campaignId, status: "done", sent, failed });
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
      db.select({ tags: schema.contacts.tags, phone: schema.contacts.phone }).from(schema.contacts).where(eq(schema.contacts.companyId, p.companyId)),
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
        // Com mídia, a mensagem (legenda) pode ficar vazia.
        message: z.string().max(4096).default(""),
        mediaUrl: z.string().url().max(2048).optional(),
        mediaType: z.enum(["image", "file"]).optional(),
        audience: z.enum(["all", "tag", "contacts"]).default("all"),
        tag: z.string().max(64).optional(),
        contactIds: z.array(z.string().uuid()).max(5000).optional(),
        scheduledAt: z.string().datetime({ offset: true }).optional(),
        dispatch: DispatchSchema.optional(),
      }),
      req.body
    );
    const p = req.principal;

    const mediaUrl = body.mediaUrl?.trim() || null;
    const mediaType = mediaUrl ? (body.mediaType ?? "image") : null;
    if (!body.message.trim() && !mediaUrl) {
      throw new ApiError(400, "Escreva uma mensagem ou anexe uma mídia.");
    }
    // Config de disparo: merge do que veio com o padrão (mantém sanidade).
    const dispatch = body.dispatch ? dispatchOf({ dispatch: body.dispatch }) : DEFAULT_DISPATCH;

    const audience = await resolveAudience(p.companyId, {
      all: body.audience === "all",
      tag: body.audience === "tag" ? body.tag : undefined,
      contactIds: body.audience === "contacts" ? body.contactIds : undefined,
    });
    if (!audience.length) throw new ApiError(400, "Nenhum contato com telefone no público selecionado.");

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
        mediaUrl,
        mediaType,
        dispatch,
        status,
        filterTag: body.audience === "tag" ? body.tag ?? null : null,
        scheduledAt,
        total: audience.length,
        createdByUserId: p.userId ?? null,
      })
      .returning();

    await db.insert(schema.campaignRecipients).values(
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
