import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";

/**
 * Kit de atendimento (Fase 10):
 *   - Respostas rápidas (quick replies): atalhos de mensagem para o atendente.
 *   - Tags / etiquetas: rótulos coloridos aplicados às conversas.
 *   - Notas internas: anotações na conversa, visíveis só para a equipe.
 */

export async function toolkitRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ---- Respostas rápidas ----------------------------------------------------
  app.get("/quick-replies", async (req) => {
    const rows = await db
      .select()
      .from(schema.quickReplies)
      .where(eq(schema.quickReplies.companyId, req.principal.companyId))
      .orderBy(asc(schema.quickReplies.shortcut));
    return { data: rows };
  });
  app.post("/quick-replies", async (req, reply) => {
    const body = parse(
      z.object({ shortcut: z.string().min(1).max(40), message: z.string().min(1).max(4000) }),
      req.body
    );
    const [row] = await db
      .insert(schema.quickReplies)
      .values({ companyId: req.principal.companyId, ...body })
      .returning();
    return reply.code(201).send(row);
  });
  app.patch("/quick-replies/:id", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(
      z.object({ shortcut: z.string().min(1).max(40).optional(), message: z.string().min(1).max(4000).optional() }),
      req.body
    );
    const [row] = await db
      .update(schema.quickReplies)
      .set(body)
      .where(and(eq(schema.quickReplies.id, id), eq(schema.quickReplies.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Resposta rápida não encontrada");
    return row;
  });
  app.delete("/quick-replies/:id", async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .delete(schema.quickReplies)
      .where(and(eq(schema.quickReplies.id, id), eq(schema.quickReplies.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Resposta rápida não encontrada");
    return reply.code(204).send();
  });

  // ---- Tags -----------------------------------------------------------------
  app.get("/tags", async (req) => {
    const rows = await db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.companyId, req.principal.companyId))
      .orderBy(asc(schema.tags.name));
    return { data: rows };
  });
  app.post("/tags", { preHandler: requireAdmin }, async (req, reply) => {
    const body = parse(
      z.object({ name: z.string().min(1).max(60), color: z.string().max(16).default("#6d28d9") }),
      req.body
    );
    const [row] = await db
      .insert(schema.tags)
      .values({ companyId: req.principal.companyId, ...body })
      .returning();
    return reply.code(201).send(row);
  });
  app.patch("/tags/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(
      z.object({ name: z.string().min(1).max(60).optional(), color: z.string().max(16).optional() }),
      req.body
    );
    const [row] = await db
      .update(schema.tags)
      .set(body)
      .where(and(eq(schema.tags.id, id), eq(schema.tags.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Tag não encontrada");
    return row;
  });
  app.delete("/tags/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .delete(schema.tags)
      .where(and(eq(schema.tags.id, id), eq(schema.tags.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Tag não encontrada");
    return reply.code(204).send();
  });

  // Define as tags de uma conversa (lista de tagIds).
  app.put("/conversations/:id/tags", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const { tagIds } = parse(z.object({ tagIds: z.array(z.string().uuid()) }), req.body);
    const cid = req.principal.companyId;
    const [conv] = await db
      .select({ id: schema.conversations.id })
      .from(schema.conversations)
      .where(and(eq(schema.conversations.id, id), eq(schema.conversations.companyId, cid)));
    if (!conv) throw new ApiError(404, "Conversa não encontrada");
    await db.delete(schema.conversationTags).where(eq(schema.conversationTags.conversationId, id));
    if (tagIds.length) {
      await db.insert(schema.conversationTags).values(
        tagIds.map((tagId) => ({ companyId: cid, conversationId: id, tagId }))
      );
    }
    return { conversationId: id, tagIds };
  });

  // ---- Notas internas -------------------------------------------------------
  app.get("/conversations/:id/notes", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const rows = await db
      .select({
        id: schema.conversationNotes.id,
        body: schema.conversationNotes.body,
        createdAt: schema.conversationNotes.createdAt,
        author: schema.users.name,
      })
      .from(schema.conversationNotes)
      .leftJoin(schema.users, eq(schema.users.id, schema.conversationNotes.authorUserId))
      .where(
        and(
          eq(schema.conversationNotes.conversationId, id),
          eq(schema.conversationNotes.companyId, req.principal.companyId)
        )
      )
      .orderBy(desc(schema.conversationNotes.createdAt));
    return { data: rows };
  });
  app.post("/conversations/:id/notes", async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const { body } = parse(z.object({ body: z.string().min(1).max(4000) }), req.body);
    const [row] = await db
      .insert(schema.conversationNotes)
      .values({ companyId: req.principal.companyId, conversationId: id, authorUserId: req.principal.userId, body })
      .returning();
    return reply.code(201).send(row);
  });
  app.delete("/notes/:id", async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .delete(schema.conversationNotes)
      .where(and(eq(schema.conversationNotes.id, id), eq(schema.conversationNotes.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Nota não encontrada");
    return reply.code(204).send();
  });
}

/** Helper: mapa conversationId -> [tags] para uma lista de conversas. */
export async function tagsForConversations(companyId: string, convIds: string[]) {
  if (!convIds.length) return {} as Record<string, { id: string; name: string; color: string }[]>;
  const rows = await db
    .select({
      conversationId: schema.conversationTags.conversationId,
      id: schema.tags.id,
      name: schema.tags.name,
      color: schema.tags.color,
    })
    .from(schema.conversationTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.conversationTags.tagId))
    .where(and(eq(schema.conversationTags.companyId, companyId), inArray(schema.conversationTags.conversationId, convIds)));
  const map: Record<string, { id: string; name: string; color: string }[]> = {};
  for (const r of rows) {
    (map[r.conversationId] ??= []).push({ id: r.id, name: r.name, color: r.color });
  }
  return map;
}
