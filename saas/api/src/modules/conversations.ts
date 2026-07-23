import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq, isNull, sql as dsql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, parse, paginated, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";
import { deliverOutbound } from "../channels/registry.js";
import { sendToContact } from "../channels/whatsapp.js";
import { tagsForConversations } from "./toolkit.js";

const ListQuery = z.object({
  status: z.enum(["pending", "open", "resolved"]).optional(),
  assignedToMe: z.coerce.boolean().default(false),
  queueId: z.string().uuid().optional(),
  page: z.coerce.number().default(1),
  perPage: z.coerce.number().default(20),
});

export async function conversationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/conversations", async (req) => {
    const { status, assignedToMe, queueId, page, perPage } = parse(ListQuery, req.query);
    const p = req.principal;
    const { limit, offset } = paginated(page, perPage);
    const conds = [eq(schema.conversations.companyId, p.companyId)];
    if (status) conds.push(eq(schema.conversations.status, status));
    if (assignedToMe && p.userId) conds.push(eq(schema.conversations.assignedUserId, p.userId));
    if (queueId) conds.push(eq(schema.conversations.queueId, queueId));
    const where = and(...conds);

    const rows = await db
      .select({
        id: schema.conversations.id,
        status: schema.conversations.status,
        unreadCount: schema.conversations.unreadCount,
        lastMessageAt: schema.conversations.lastMessageAt,
        createdAt: schema.conversations.createdAt,
        contact: { id: schema.contacts.id, name: schema.contacts.name, phone: schema.contacts.phone },
        assignedUserId: schema.conversations.assignedUserId,
        channelId: schema.conversations.channelId,
        queueId: schema.conversations.queueId,
      })
      .from(schema.conversations)
      .innerJoin(schema.contacts, eq(schema.contacts.id, schema.conversations.contactId))
      .where(where)
      .orderBy(desc(schema.conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: dsql<number>`count(*)::int` })
      .from(schema.conversations)
      .where(where);
    const tagMap = await tagsForConversations(p.companyId, rows.map((r) => r.id));
    const data = rows.map((r) => ({ ...r, tags: tagMap[r.id] ?? [] }));
    return { data, meta: { page, perPage: limit, total: count } };
  });

  app.get("/conversations/:id", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const p = req.principal;
    const [conv] = await db
      .select()
      .from(schema.conversations)
      .where(and(eq(schema.conversations.id, id), eq(schema.conversations.companyId, p.companyId)));
    if (!conv) throw new ApiError(404, "Conversa não encontrada");
    const [contact] = await db.select().from(schema.contacts).where(eq(schema.contacts.id, conv.contactId));
    const msgs = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, id))
      .orderBy(asc(schema.messages.createdAt))
      .limit(500);
    // marca como lida
    if (conv.unreadCount > 0) {
      await db.update(schema.conversations).set({ unreadCount: 0 }).where(eq(schema.conversations.id, id));
    }
    const tagMap = await tagsForConversations(p.companyId, [id]);
    return { ...conv, contact, messages: msgs, tags: tagMap[id] ?? [] };
  });

  // Envia mensagem do atendente (outbound)
  app.post("/conversations/:id/messages", async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const { body } = parse(z.object({ body: z.string().min(1).max(4096) }), req.body);
    const p = req.principal;

    const [conv] = await db
      .select()
      .from(schema.conversations)
      .where(and(eq(schema.conversations.id, id), eq(schema.conversations.companyId, p.companyId)));
    if (!conv) throw new ApiError(404, "Conversa não encontrada");

    const [msg] = await db
      .insert(schema.messages)
      .values({
        companyId: p.companyId,
        conversationId: id,
        direction: "out",
        authorUserId: p.userId,
        body,
      })
      .returning();

    const patch: Record<string, unknown> = { lastMessageAt: new Date(), status: "open" };
    if (!conv.firstResponseAt) patch.firstResponseAt = new Date();
    if (!conv.assignedUserId && p.userId) patch.assignedUserId = p.userId;
    await db.update(schema.conversations).set(patch).where(eq(schema.conversations.id, id));

    // entrega pelo canal vinculado (simulador) — não bloqueia a resposta
    deliverOutbound(conv.channelId, conv.contactId, body).catch(() => {});
    // e também no WhatsApp do cliente, se a empresa tiver o número conectado.
    // Assim a conversa que começou no chat do site continua no WhatsApp dele.
    sendToContact(p.companyId, conv.contactId, body).catch(() => {});

    emitToCompany(p.companyId, "message.created", { conversationId: id, message: msg });
    publishEvent(p.companyId, "message.created", { conversationId: id, message: msg }).catch(() => {});
    audit(p, "message.sent", "conversation", id);
    return reply.code(201).send(msg);
  });

  app.patch("/conversations/:id", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(
      z.object({
        status: z.enum(["pending", "open", "resolved"]).optional(),
        assignedUserId: z.string().uuid().nullable().optional(),
        queueId: z.string().uuid().nullable().optional(),
      }),
      req.body
    );
    const p = req.principal;
    const [conv] = await db
      .update(schema.conversations)
      .set(body)
      .where(and(eq(schema.conversations.id, id), eq(schema.conversations.companyId, p.companyId)))
      .returning();
    if (!conv) throw new ApiError(404, "Conversa não encontrada");
    emitToCompany(p.companyId, "conversation.updated", conv);
    publishEvent(p.companyId, "conversation.updated", conv).catch(() => {});
    audit(p, "conversation.updated", "conversation", id, body);
    return conv;
  });

  // Métricas para o dashboard
  app.get("/dashboard/metrics", async (req) => {
    const p = req.principal;
    const cid = p.companyId;
    const [byStatus, [msgToday], [contactsTotal], [avgFirstResponse], series, byQueue] = await Promise.all([
      db
        .select({ status: schema.conversations.status, count: dsql<number>`count(*)::int` })
        .from(schema.conversations)
        .where(eq(schema.conversations.companyId, cid))
        .groupBy(schema.conversations.status),
      db
        .select({ count: dsql<number>`count(*)::int` })
        .from(schema.messages)
        .where(and(eq(schema.messages.companyId, cid), dsql`created_at >= date_trunc('day', now())`)),
      db
        .select({ count: dsql<number>`count(*)::int` })
        .from(schema.contacts)
        .where(eq(schema.contacts.companyId, cid)),
      db
        .select({
          seconds: dsql<number | null>`avg(extract(epoch from first_response_at - created_at))::int`,
        })
        .from(schema.conversations)
        .where(and(eq(schema.conversations.companyId, cid), dsql`first_response_at is not null`)),
      // mensagens por dia nos últimos 7 dias
      db
        .select({ day: dsql<string>`to_char(date_trunc('day', created_at), 'YYYY-MM-DD')`, count: dsql<number>`count(*)::int` })
        .from(schema.messages)
        .where(and(eq(schema.messages.companyId, cid), dsql`created_at >= date_trunc('day', now()) - interval '6 days'`))
        .groupBy(dsql`date_trunc('day', created_at)`),
      // conversas por fila
      db
        .select({ name: schema.queues.name, color: schema.queues.color, count: dsql<number>`count(${schema.conversations.id})::int` })
        .from(schema.queues)
        .leftJoin(schema.conversations, eq(schema.conversations.queueId, schema.queues.id))
        .where(eq(schema.queues.companyId, cid))
        .groupBy(schema.queues.id, schema.queues.name, schema.queues.color),
    ]);
    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r.count]));
    // monta a série contínua de 7 dias (preenche zeros)
    const seriesMap = Object.fromEntries(series.map((r) => [r.day, r.count]));
    const days: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key, count: seriesMap[key] ?? 0 });
    }
    return {
      conversations: {
        pending: statusMap.pending ?? 0,
        open: statusMap.open ?? 0,
        resolved: statusMap.resolved ?? 0,
      },
      messagesToday: msgToday.count,
      contacts: contactsTotal.count,
      avgFirstResponseSeconds: avgFirstResponse.seconds,
      messages7d: days,
      byQueue: byQueue.map((q) => ({ name: q.name, color: q.color, count: Number(q.count) })),
    };
  });
}
