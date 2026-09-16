import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";
import { isOpenNow } from "../lib/schedule.js";

const ScheduleSchema = z
  .object({
    enabled: z.boolean().default(false),
    days: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    start: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    end: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    message: z.string().max(1000).optional(),
  })
  .optional();

/**
 * Filas / Departamentos (Fase 8). Setores de atendimento (Suporte, Vendas…)
 * para onde as conversas são roteadas. Cada fila tem atendentes participantes.
 *
 * Leitura: qualquer usuário logado (para filtrar conversas e transferir).
 * Escrita (criar/editar filas e gerenciar membros): só admin.
 */

export async function queueRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Lista as filas da empresa, com a contagem de membros.
  app.get("/queues", async (req) => {
    const rows = await db
      .select()
      .from(schema.queues)
      .where(eq(schema.queues.companyId, req.principal.companyId))
      .orderBy(asc(schema.queues.orderIndex), asc(schema.queues.createdAt));
    const members = rows.length
      ? await db
          .select()
          .from(schema.userQueues)
          .where(
            inArray(
              schema.userQueues.queueId,
              rows.map((q) => q.id)
            )
          )
      : [];
    const data = rows.map((q) => ({
      ...q,
      memberIds: members.filter((m) => m.queueId === q.id).map((m) => m.userId),
      isOpen: isOpenNow(q.schedule as Record<string, unknown>),
    }));
    return { data };
  });

  app.post("/queues", { preHandler: requireAdmin }, async (req, reply) => {
    const body = parse(
      z.object({
        name: z.string().min(1).max(80),
        color: z.string().max(16).default("#6d28d9"),
        orderIndex: z.number().int().min(0).default(0),
        schedule: ScheduleSchema,
      }),
      req.body
    );
    const [row] = await db
      .insert(schema.queues)
      .values({ companyId: req.principal.companyId, ...body, schedule: body.schedule ?? {} })
      .returning();
    return reply.code(201).send(row);
  });

  app.patch("/queues/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(
      z.object({
        name: z.string().min(1).max(80).optional(),
        color: z.string().max(16).optional(),
        orderIndex: z.number().int().min(0).optional(),
        schedule: ScheduleSchema,
      }),
      req.body
    );
    const [row] = await db
      .update(schema.queues)
      .set(body)
      .where(and(eq(schema.queues.id, id), eq(schema.queues.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Fila não encontrada");
    return row;
  });

  app.delete("/queues/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .delete(schema.queues)
      .where(and(eq(schema.queues.id, id), eq(schema.queues.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Fila não encontrada");
    // solta as conversas que estavam nesta fila
    await db
      .update(schema.conversations)
      .set({ queueId: null })
      .where(eq(schema.conversations.queueId, id));
    return reply.code(204).send();
  });

  // Define os membros da fila de uma vez (lista de userIds). (admin)
  app.put("/queues/:id/members", { preHandler: requireAdmin }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const { userIds } = parse(z.object({ userIds: z.array(z.string().uuid()) }), req.body);
    const [queue] = await db
      .select()
      .from(schema.queues)
      .where(and(eq(schema.queues.id, id), eq(schema.queues.companyId, req.principal.companyId)));
    if (!queue) throw new ApiError(404, "Fila não encontrada");
    await db.delete(schema.userQueues).where(eq(schema.userQueues.queueId, id));
    if (userIds.length) {
      await db
        .insert(schema.userQueues)
        .values(
          userIds.map((userId) => ({ companyId: req.principal.companyId, queueId: id, userId }))
        );
    }
    return { queueId: id, memberIds: userIds };
  });
}
