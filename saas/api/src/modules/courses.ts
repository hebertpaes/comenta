import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";

/**
 * Academia Comenta (Fase 6) — cursos/treinamentos com vídeo.
 *
 * Leitura: qualquer usuário logado (admin e atendentes) vê os cursos e aulas
 * publicados — é material de treinamento do time. Escrita (criar/editar cursos
 * e aulas): só admin.
 */

const LEVELS = ["iniciante", "intermediario", "avancado"] as const;

export async function courseRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Lista de cursos da empresa (com nº de aulas).
  app.get("/courses", async (req) => {
    const rows = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.companyId, req.principal.companyId))
      .orderBy(asc(schema.courses.position), asc(schema.courses.createdAt));
    const withCounts = await Promise.all(
      rows.map(async (c) => {
        const ls = await db
          .select({ id: schema.lessons.id })
          .from(schema.lessons)
          .where(eq(schema.lessons.courseId, c.id));
        return { ...c, lessonCount: ls.length };
      })
    );
    return { data: withCounts, levels: LEVELS };
  });

  // Um curso + suas aulas ordenadas.
  app.get("/courses/:id", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [course] = await db
      .select()
      .from(schema.courses)
      .where(and(eq(schema.courses.id, id), eq(schema.courses.companyId, req.principal.companyId)));
    if (!course) throw new ApiError(404, "Curso não encontrado");
    const lessons = await db
      .select()
      .from(schema.lessons)
      .where(eq(schema.lessons.courseId, id))
      .orderBy(asc(schema.lessons.position), asc(schema.lessons.createdAt));
    return { ...course, lessons };
  });

  // --- Escrita: só admin ---
  app.post("/courses", { preHandler: requireAdmin }, async (req, reply) => {
    const body = parse(
      z.object({
        title: z.string().min(1).max(160),
        description: z.string().max(4000).default(""),
        emoji: z.string().max(8).default("🎓"),
        level: z.enum(LEVELS).default("iniciante"),
        isPublished: z.boolean().default(true),
        position: z.number().int().min(0).default(0),
      }),
      req.body
    );
    const [row] = await db
      .insert(schema.courses)
      .values({ companyId: req.principal.companyId, ...body })
      .returning();
    return reply.code(201).send(row);
  });

  app.patch("/courses/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(
      z.object({
        title: z.string().min(1).max(160).optional(),
        description: z.string().max(4000).optional(),
        emoji: z.string().max(8).optional(),
        level: z.enum(LEVELS).optional(),
        isPublished: z.boolean().optional(),
        position: z.number().int().min(0).optional(),
      }),
      req.body
    );
    const [row] = await db
      .update(schema.courses)
      .set(body)
      .where(and(eq(schema.courses.id, id), eq(schema.courses.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Curso não encontrado");
    return row;
  });

  app.delete("/courses/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .delete(schema.courses)
      .where(and(eq(schema.courses.id, id), eq(schema.courses.companyId, req.principal.companyId)))
      .returning();
    if (!row) throw new ApiError(404, "Curso não encontrado");
    return reply.code(204).send();
  });

  // Garante que o curso é da empresa antes de mexer nas aulas.
  async function ownCourse(companyId: string, courseId: string) {
    const [c] = await db
      .select({ id: schema.courses.id })
      .from(schema.courses)
      .where(and(eq(schema.courses.id, courseId), eq(schema.courses.companyId, companyId)));
    if (!c) throw new ApiError(404, "Curso não encontrado");
  }

  app.post("/courses/:id/lessons", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    await ownCourse(req.principal.companyId, id);
    const body = parse(
      z.object({
        title: z.string().min(1).max(160),
        videoUrl: z.string().max(500).default(""),
        content: z.string().max(20000).default(""),
        durationMin: z.number().int().min(0).default(0),
        position: z.number().int().min(0).default(0),
      }),
      req.body
    );
    const [row] = await db
      .insert(schema.lessons)
      .values({ courseId: id, ...body })
      .returning();
    return reply.code(201).send(row);
  });

  app.patch("/lessons/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(
      z.object({
        title: z.string().min(1).max(160).optional(),
        videoUrl: z.string().max(500).optional(),
        content: z.string().max(20000).optional(),
        durationMin: z.number().int().min(0).optional(),
        position: z.number().int().min(0).optional(),
      }),
      req.body
    );
    // só permite editar aula de curso da empresa
    const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id));
    if (!lesson) throw new ApiError(404, "Aula não encontrada");
    await ownCourse(req.principal.companyId, lesson.courseId);
    const [row] = await db
      .update(schema.lessons)
      .set(body)
      .where(eq(schema.lessons.id, id))
      .returning();
    return row;
  });

  app.delete("/lessons/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id));
    if (!lesson) throw new ApiError(404, "Aula não encontrada");
    await ownCourse(req.principal.companyId, lesson.courseId);
    await db.delete(schema.lessons).where(eq(schema.lessons.id, id));
    return reply.code(204).send();
  });
}
