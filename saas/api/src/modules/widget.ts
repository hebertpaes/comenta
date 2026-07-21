import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { and, asc, eq, gt } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { config } from "../config.js";
import { parse, ApiError } from "../lib/http.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";

/**
 * Widget público do chat do site.
 *
 * Quando o visitante do site pede "falar com um humano", o chat abre uma
 * conversa REAL na plataforma (contato + conversa + mensagens). O atendente
 * responde pelo painel e o visitante vê a resposta no próprio chat do site
 * (polling) — sem sair para o WhatsApp.
 *
 * Sem login: cada conversa recebe um token assinado (HMAC) que autoriza o
 * visitante a enviar e ler mensagens só daquela conversa.
 */

// Empresa alvo do widget. Em produção defina WIDGET_COMPANY_ID; localmente
// (uma única empresa demo) resolvemos a primeira empresa criada.
let cachedCompanyId: string | null = process.env.WIDGET_COMPANY_ID || null;
async function widgetCompanyId(): Promise<string> {
  if (cachedCompanyId) return cachedCompanyId;
  const [company] = await db
    .select({ id: schema.companies.id })
    .from(schema.companies)
    .orderBy(asc(schema.companies.createdAt))
    .limit(1);
  if (!company) throw new ApiError(503, "Nenhuma empresa configurada para o widget");
  cachedCompanyId = company.id;
  return cachedCompanyId;
}

function signToken(conversationId: string): string {
  return crypto.createHmac("sha256", config.JWT_SECRET).update(conversationId).digest("hex");
}
function verifyToken(conversationId: string, token: string): boolean {
  const expected = signToken(conversationId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const StartBody = z.object({
  name: z.string().min(1).max(80).optional(),
  team: z.string().min(1).max(40).optional(),
  // WhatsApp obrigatório: só dígitos (com DDI+DDD), 10 a 15.
  phone: z.string().regex(/^\+?\d{10,15}$/, "informe um WhatsApp válido (com DDD)"),
  message: z.string().max(2000).optional(),
});
const MsgBody = z.object({
  conversationId: z.string().uuid(),
  token: z.string().min(16),
  body: z.string().min(1).max(2000),
});
const PollQuery = z.object({
  conversationId: z.string().uuid(),
  token: z.string().min(16),
  after: z.string().datetime().optional(),
});

export async function widgetRoutes(app: FastifyInstance) {
  // Inicia um atendimento humano a partir do site.
  app.post("/widget/start", async (req, reply) => {
    const { name, team, phone, message } = parse(StartBody, req.body);
    const companyId = await widgetCompanyId();
    const digits = phone.replace(/\D/g, "");

    // Reusa o contato pelo WhatsApp (índice único company+phone) ou cria.
    let [contact] = await db
      .select()
      .from(schema.contacts)
      .where(and(eq(schema.contacts.companyId, companyId), eq(schema.contacts.phone, digits)));
    if (!contact) {
      [contact] = await db
        .insert(schema.contacts)
        .values({ companyId, name: name?.trim() || "Visitante do site", phone: digits, tags: team ? [team] : [] })
        .returning();
    }

    const [conv] = await db
      .insert(schema.conversations)
      .values({ companyId, contactId: contact.id, status: "pending", unreadCount: 1, lastMessageAt: new Date() })
      .returning();

    const first = message?.trim() || `Olá! Vim pelo site e gostaria de falar com o time${team ? ` de ${team}` : ""}.`;
    const [msg] = await db
      .insert(schema.messages)
      .values({ companyId, conversationId: conv.id, direction: "in", body: first })
      .returning();

    emitToCompany(companyId, "conversation.created", { conversation: conv, contact });
    emitToCompany(companyId, "message.created", { conversationId: conv.id, message: msg });
    publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(() => {});

    return reply.code(201).send({ conversationId: conv.id, token: signToken(conv.id) });
  });

  // Visitante envia uma mensagem (inbound).
  app.post("/widget/message", async (req, reply) => {
    const { conversationId, token, body } = parse(MsgBody, req.body);
    if (!verifyToken(conversationId, token)) throw new ApiError(401, "Token inválido");

    const [conv] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, conversationId));
    if (!conv) throw new ApiError(404, "Conversa não encontrada");

    const [msg] = await db
      .insert(schema.messages)
      .values({ companyId: conv.companyId, conversationId, direction: "in", body })
      .returning();
    await db
      .update(schema.conversations)
      .set({ lastMessageAt: new Date(), unreadCount: (conv.unreadCount ?? 0) + 1 })
      .where(eq(schema.conversations.id, conversationId));

    emitToCompany(conv.companyId, "message.created", { conversationId, message: msg });
    publishEvent(conv.companyId, "message.created", { conversationId, message: msg }).catch(() => {});

    return reply.code(201).send({ id: msg.id, createdAt: msg.createdAt });
  });

  // Visitante busca novas mensagens (respostas do atendente).
  app.get("/widget/messages", async (req) => {
    const { conversationId, token, after } = parse(PollQuery, req.query);
    if (!verifyToken(conversationId, token)) throw new ApiError(401, "Token inválido");

    const conds = [eq(schema.messages.conversationId, conversationId)];
    if (after) conds.push(gt(schema.messages.createdAt, new Date(after)));

    const rows = await db
      .select({
        id: schema.messages.id,
        direction: schema.messages.direction,
        body: schema.messages.body,
        createdAt: schema.messages.createdAt,
        author: schema.users.name,
      })
      .from(schema.messages)
      .leftJoin(schema.users, eq(schema.users.id, schema.messages.authorUserId))
      .where(and(...conds))
      .orderBy(asc(schema.messages.createdAt));

    return { data: rows };
  });
}
