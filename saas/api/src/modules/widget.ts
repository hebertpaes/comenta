import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { and, asc, eq, gt } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { config } from "../config.js";
import { parse, ApiError } from "../lib/http.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";
import { aiEnabled, chatAssistant } from "../lib/ai.js";
import { applyAutomations } from "./automations.js";
import { isOpenNow } from "../lib/schedule.js";
import { companyWidgetKnowledge } from "./settings.js";

// Base de conhecimento padrão do assistente do site (sobre o Comenta).
// Em produção, cada empresa pode ter a sua (roadmap: editar pelo painel).
const COMENTA_KB = `
Comenta é uma plataforma de atendimento multicanal com IA.
Canais: chat no site, WhatsApp Business, e um painel para os atendentes.
Planos: Free (R$0, sem cartão), Pro (R$99/mês — todos os canais + IA completa),
Business (R$299/mês — multi-empresa, API, SLA). Começa no Free e migra quando quiser.
A IA (Claude) classifica, resume e sugere respostas; o atendente revisa e envia.
Integrações via API e webhooks (automação com n8n/Zapier).
`.trim();

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
const AiBody = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(20)
    .optional(),
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

    // Direciona para a fila do time escolhido (se houver uma com esse nome) e
    // avalia o horário de atendimento dela.
    let queue: typeof schema.queues.$inferSelect | undefined;
    if (team) {
      const qs = await db.select().from(schema.queues).where(eq(schema.queues.companyId, companyId));
      queue = qs.find((q) => q.name.toLowerCase() === team.toLowerCase());
    }

    const [conv] = await db
      .insert(schema.conversations)
      .values({ companyId, contactId: contact.id, queueId: queue?.id ?? null, status: "pending", unreadCount: 1, lastMessageAt: new Date() })
      .returning();

    const first = message?.trim() || `Olá! Vim pelo site e gostaria de falar com o time${team ? ` de ${team}` : ""}.`;
    const [msg] = await db
      .insert(schema.messages)
      .values({ companyId, conversationId: conv.id, direction: "in", body: first })
      .returning();

    emitToCompany(companyId, "conversation.created", { conversation: conv, contact });
    emitToCompany(companyId, "message.created", { conversationId: conv.id, message: msg });
    publishEvent(companyId, "conversation.created", { conversation: conv, contact }).catch(() => {});
    publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(() => {});
    // bot de fluxo (boas-vindas / fora do horário / palavra-chave)
    applyAutomations(companyId, { id: conv.id, contactId: contact.id }, first, true).catch(() => {});

    // Fora do horário de atendimento da fila → responde a mensagem configurada.
    const sched = (queue?.schedule as Record<string, unknown> | undefined) ?? {};
    if (queue && sched.enabled && !isOpenNow(sched)) {
      const outMsg = String(sched.message || `No momento estamos fora do horário de atendimento do time ${queue.name}. Deixe sua mensagem que retornaremos assim que possível. 🙂`);
      const [bot] = await db
        .insert(schema.messages)
        .values({ companyId, conversationId: conv.id, direction: "out", body: outMsg })
        .returning();
      emitToCompany(companyId, "message.created", { conversationId: conv.id, message: bot });
      publishEvent(companyId, "message.created", { conversationId: conv.id, message: bot }).catch(() => {});
    }

    return reply.code(201).send({ conversationId: conv.id, token: signToken(conv.id) });
  });

  // Visitante envia uma mensagem (inbound).
  app.post("/widget/message", async (req, reply) => {
    const { conversationId, token, body } = parse(MsgBody, req.body);
    if (!verifyToken(conversationId, token)) throw new ApiError(401, "Token inválido");

    const [conv] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, conversationId));
    if (!conv) throw new ApiError(404, "Conversa não encontrada");

    // Se a conversa aguarda avaliação, esta resposta pode ser a nota do cliente.
    const consumed = await import("./ratings.js")
      .then((m) => m.tryCaptureRating(conv.companyId, conv.contactId, body))
      .catch(() => false);
    if (consumed) return reply.code(201).send({ ok: true, rated: true });

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
    applyAutomations(conv.companyId, { id: conversationId, contactId: conv.contactId }, body, false).catch(() => {});

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

  // Chat com IA real (Claude) direto no site — o visitante conversa e a IA
  // responde com base no conhecimento do Comenta. Sem login. Se não houver
  // ANTHROPIC_API_KEY, devolve aiEnabled=false e o site cai nas respostas guiadas.
  app.post("/widget/ai", async (req, reply) => {
    const { message, history } = parse(AiBody, req.body);
    if (!aiEnabled()) return reply.send({ reply: null, aiEnabled: false });
    try {
      const turns = [...(history ?? []), { role: "user" as const, content: message }];
      // Usa a base de conhecimento definida pela empresa (Configurações), com
      // fallback para a base padrão do Comenta.
      const companyId = await widgetCompanyId().catch(() => null);
      const kb = (companyId && (await companyWidgetKnowledge(companyId))) || COMENTA_KB;
      const answer = await chatAssistant(turns, { companyName: "Comenta", knowledge: kb });
      return reply.send({ reply: answer, aiEnabled: true });
    } catch (err) {
      req.log.error(err);
      return reply.send({ reply: null, aiEnabled: true, error: true });
    }
  });
}
