import type { FastifyInstance } from "fastify";
import { and, desc, eq, gt, isNotNull, sql as dsql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate } from "../lib/http.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";

/**
 * Avaliação / NPS (Lote 4).
 *
 * Quando uma conversa é resolvida e existe uma automação ativa do tipo "rating",
 * o cliente recebe um pedido de nota (ex.: "De 0 a 10, como você avalia...?") e a
 * conversa fica "aguardando avaliação". A próxima resposta numérica do cliente,
 * dentro de uma janela de tempo, vira uma avaliação e dispara o agradecimento.
 *
 * A configuração (mensagem, escala 5/10 e agradecimento) mora numa automação do
 * tipo "rating" — liga/desliga pelo toggle da automação.
 */

const WINDOW_HOURS = 24;

type RatingConfig = { message: string; scale: number; thanks: string };

async function activeRatingConfig(companyId: string): Promise<RatingConfig | null> {
  const rules = await db
    .select()
    .from(schema.automations)
    .where(and(eq(schema.automations.companyId, companyId), eq(schema.automations.isActive, true)));
  const rule = rules.find((r) => r.type === "rating");
  if (!rule) return null;
  const cfg = (rule.config as Record<string, unknown>) || {};
  const scale = Number(cfg.scale) === 5 ? 5 : 10;
  return {
    scale,
    message: String(
      cfg.message ||
        `De 0 a ${scale}, como você avalia nosso atendimento? Responda apenas com o número. 🙏`
    ),
    thanks: String(cfg.thanks || "Obrigado pela sua avaliação! 💜"),
  };
}

// Registra uma mensagem de saída numa conversa e entrega no WhatsApp (best-effort).
async function botSay(companyId: string, conversationId: string, contactId: string, body: string) {
  const [msg] = await db
    .insert(schema.messages)
    .values({ companyId, conversationId, direction: "out", body })
    .returning();
  await db
    .update(schema.conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(schema.conversations.id, conversationId));
  emitToCompany(companyId, "message.created", { conversationId, message: msg });
  publishEvent(companyId, "message.created", { conversationId, message: msg }).catch(() => {});
  await import("../channels/whatsapp.js")
    .then((m) => m.sendToContact(companyId, contactId, body))
    .catch(() => {});
}

/** Chamado quando a conversa é resolvida: se a pesquisa estiver ativa, pede a nota. */
export async function requestRatingOnResolve(
  companyId: string,
  conv: { id: string; contactId: string }
) {
  const cfg = await activeRatingConfig(companyId);
  if (!cfg) return;
  await db
    .update(schema.conversations)
    .set({ awaitingRatingAt: new Date() })
    .where(eq(schema.conversations.id, conv.id));
  await botSay(companyId, conv.id, conv.contactId, cfg.message);
}

/** Tenta interpretar a mensagem recebida como uma nota de avaliação.
 *  Retorna true se consumiu a mensagem (não deve seguir o fluxo normal). */
export async function tryCaptureRating(
  companyId: string,
  contactId: string,
  text: string
): Promise<boolean> {
  const cfg = await activeRatingConfig(companyId);
  if (!cfg) return false;

  // Conversa mais recente deste contato aguardando avaliação, dentro da janela.
  const since = new Date(Date.now() - WINDOW_HOURS * 3600_000);
  const [conv] = await db
    .select()
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.companyId, companyId),
        eq(schema.conversations.contactId, contactId),
        isNotNull(schema.conversations.awaitingRatingAt),
        gt(schema.conversations.awaitingRatingAt, since)
      )
    )
    .orderBy(desc(schema.conversations.awaitingRatingAt))
    .limit(1);
  if (!conv) return false;

  // Extrai o primeiro número inteiro da resposta.
  const m = (text || "").match(/-?\d+/);
  if (!m) return false;
  const score = parseInt(m[0], 10);
  if (Number.isNaN(score) || score < 0 || score > cfg.scale) {
    // fora da escala: não consome (deixa virar mensagem normal / reabre)
    return false;
  }

  await db.insert(schema.ratings).values({
    companyId,
    conversationId: conv.id,
    contactId,
    agentUserId: conv.assignedUserId ?? null,
    score,
    scale: cfg.scale,
  });
  await db
    .update(schema.conversations)
    .set({ awaitingRatingAt: null })
    .where(eq(schema.conversations.id, conv.id));
  emitToCompany(companyId, "rating.created", { conversationId: conv.id, score, scale: cfg.scale });
  await botSay(companyId, conv.id, contactId, cfg.thanks);
  return true;
}

/** Métricas de avaliação para o dashboard (últimos 30 dias). */
export async function ratingMetrics(companyId: string) {
  const [row] = await db
    .select({
      count: dsql<number>`count(*)::int`,
      avg10: dsql<number | null>`avg(score::float / scale * 10)`,
      promoters: dsql<number>`count(*) filter (where score::float / scale * 10 >= 9)::int`,
      detractors: dsql<number>`count(*) filter (where score::float / scale * 10 <= 6)::int`,
    })
    .from(schema.ratings)
    .where(
      and(eq(schema.ratings.companyId, companyId), dsql`created_at >= now() - interval '30 days'`)
    );
  const count = row?.count ?? 0;
  const avg = row?.avg10 != null ? Math.round(Number(row.avg10) * 10) / 10 : null;
  // NPS clássico: %promotores - %detratores (nota normalizada 0-10)
  const nps = count > 0 ? Math.round(((row.promoters - row.detractors) / count) * 100) : null;
  return { count, average: avg, nps };
}

export async function ratingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/ratings", async (req) => {
    const p = req.principal;
    const rows = await db
      .select({
        id: schema.ratings.id,
        score: schema.ratings.score,
        scale: schema.ratings.scale,
        createdAt: schema.ratings.createdAt,
        contactName: schema.contacts.name,
        agentName: schema.users.name,
      })
      .from(schema.ratings)
      .leftJoin(schema.contacts, eq(schema.contacts.id, schema.ratings.contactId))
      .leftJoin(schema.users, eq(schema.users.id, schema.ratings.agentUserId))
      .where(eq(schema.ratings.companyId, p.companyId))
      .orderBy(desc(schema.ratings.createdAt))
      .limit(50);
    const metrics = await ratingMetrics(p.companyId);
    return { data: rows, metrics };
  });
}
