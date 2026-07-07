import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import {
  aiEnabled,
  classifyConversation,
  summarizeConversation,
  suggestReply,
  type AiMessage,
} from "../lib/ai.js";

async function loadMessages(companyId: string, conversationId: string): Promise<AiMessage[]> {
  const [conv] = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.id, conversationId), eq(schema.conversations.companyId, companyId)));
  if (!conv) throw new ApiError(404, "Conversa não encontrada");
  const rows = await db
    .select({ direction: schema.messages.direction, body: schema.messages.body })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(asc(schema.messages.createdAt))
    .limit(200);
  if (rows.length === 0) throw new ApiError(422, "A conversa ainda não tem mensagens");
  return rows.map((r) => ({ direction: r.direction as "in" | "out", body: r.body }));
}

export async function aiRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", async (_req, reply) => {
    if (!aiEnabled()) {
      return reply.code(503).send({ error: "IA indisponível — configure ANTHROPIC_API_KEY" });
    }
  });

  const Params = z.object({ id: z.string().uuid() });

  app.post("/conversations/:id/ai/classify", async (req) => {
    const { id } = parse(Params, req.params);
    const messages = await loadMessages(req.principal.companyId, id);
    const result = await classifyConversation(messages);
    audit(req.principal, "ai.classify", "conversation", id);
    return result;
  });

  app.post("/conversations/:id/ai/summary", async (req) => {
    const { id } = parse(Params, req.params);
    const messages = await loadMessages(req.principal.companyId, id);
    const summary = await summarizeConversation(messages);
    audit(req.principal, "ai.summary", "conversation", id);
    return { summary };
  });

  app.post("/conversations/:id/ai/suggest", async (req) => {
    const { id } = parse(Params, req.params);
    const body = parse(z.object({ tone: z.string().max(80).optional() }), req.body ?? {});
    const messages = await loadMessages(req.principal.companyId, id);
    const [company] = await db
      .select({ name: schema.companies.name })
      .from(schema.companies)
      .where(eq(schema.companies.id, req.principal.companyId));
    const suggestion = await suggestReply(messages, { companyName: company?.name, tone: body.tone });
    audit(req.principal, "ai.suggest", "conversation", id);
    return { suggestion };
  });
}
