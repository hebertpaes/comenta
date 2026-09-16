import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, eq, gt } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, parse } from "../lib/http.js";
import { emitToCompany } from "../realtime.js";

/**
 * Chat interno da equipe — um canal único por empresa onde os atendentes
 * conversam entre si. Não vai para o cliente; é só colaboração interna.
 */
export async function teamRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Lista as mensagens (as 100 mais recentes, em ordem cronológica).
  // Aceita ?after=<ISO> para buscar só o que chegou depois (polling incremental).
  app.get("/team/messages", async (req) => {
    const { after } = parse(
      z.object({ after: z.string().datetime({ offset: true }).optional() }),
      req.query
    );
    const p = req.principal;
    const where = after
      ? and(
          eq(schema.teamMessages.companyId, p.companyId),
          gt(schema.teamMessages.createdAt, new Date(after))
        )
      : eq(schema.teamMessages.companyId, p.companyId);
    const rows = await db
      .select({
        id: schema.teamMessages.id,
        body: schema.teamMessages.body,
        createdAt: schema.teamMessages.createdAt,
        userId: schema.teamMessages.userId,
        userName: schema.users.name,
      })
      .from(schema.teamMessages)
      .leftJoin(schema.users, eq(schema.users.id, schema.teamMessages.userId))
      .where(where)
      .orderBy(asc(schema.teamMessages.createdAt))
      .limit(after ? 100 : 100);
    return { data: rows };
  });

  // Envia uma mensagem no chat da equipe.
  app.post("/team/messages", async (req, reply) => {
    const { body } = parse(z.object({ body: z.string().min(1).max(2000) }), req.body);
    const p = req.principal;
    const [row] = await db
      .insert(schema.teamMessages)
      .values({ companyId: p.companyId, userId: p.userId ?? null, body: body.trim() })
      .returning();
    const [author] = await db
      .select({ name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, p.userId ?? ""));
    const msg = { ...row, userName: author?.name ?? "Você" };
    emitToCompany(p.companyId, "team.message", msg);
    return reply.code(201).send(msg);
  });
}
