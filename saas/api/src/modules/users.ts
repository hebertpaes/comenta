import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, sql as dsql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { hashPassword } from "../lib/auth.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";

const CreateUser = z.object({
  name: z.string().min(2).max(128),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["admin", "agent"]).default("agent"),
});

const UpdateUser = z.object({
  name: z.string().min(2).max(128).optional(),
  role: z.enum(["admin", "agent"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(72).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/users", async (req) => {
    const rows = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        isActive: schema.users.isActive,
        lastLoginAt: schema.users.lastLoginAt,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.companyId, req.principal.companyId));
    return { data: rows };
  });

  app.post("/users", { preHandler: [requireAdmin] }, async (req, reply) => {
    const body = parse(CreateUser, req.body);
    const p = req.principal;

    // limite do plano
    const [company] = await db.select().from(schema.companies).where(eq(schema.companies.id, p.companyId));
    const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, company.planId));
    const [{ count }] = await db
      .select({ count: dsql<number>`count(*)::int` })
      .from(schema.users)
      .where(eq(schema.users.companyId, p.companyId));
    if (count >= plan.maxUsers) {
      throw new ApiError(402, `Limite de ${plan.maxUsers} usuários do plano ${plan.name} atingido — faça upgrade`);
    }

    const [exists] = await db.select().from(schema.users).where(eq(schema.users.email, body.email));
    if (exists) throw new ApiError(409, "E-mail já cadastrado");

    const [user] = await db
      .insert(schema.users)
      .values({
        companyId: p.companyId,
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: body.role,
      })
      .returning();
    audit(p, "user.created", "user", user.id, { email: body.email, role: body.role });
    return reply.code(201).send({ id: user.id, name: user.name, email: user.email, role: user.role });
  });

  app.patch("/users/:id", { preHandler: [requireAdmin] }, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const body = parse(UpdateUser, req.body);
    const p = req.principal;
    const patch: Record<string, unknown> = { ...body };
    delete patch.password;
    if (body.password) patch.passwordHash = await hashPassword(body.password);
    const [user] = await db
      .update(schema.users)
      .set(patch)
      .where(and(eq(schema.users.id, id), eq(schema.users.companyId, p.companyId)))
      .returning();
    if (!user) throw new ApiError(404, "Usuário não encontrado");
    audit(p, "user.updated", "user", id, body);
    return { id: user.id, name: user.name, role: user.role, isActive: user.isActive };
  });

  app.delete("/users/:id", { preHandler: [requireAdmin] }, async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const p = req.principal;
    if (id === p.userId) throw new ApiError(400, "Você não pode remover a si mesmo");
    const [user] = await db
      .delete(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.companyId, p.companyId)))
      .returning();
    if (!user) throw new ApiError(404, "Usuário não encontrado");
    audit(p, "user.deleted", "user", id);
    return reply.code(204).send();
  });
}
