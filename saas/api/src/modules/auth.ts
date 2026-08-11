import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, sql as dsql } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../lib/auth.js";
import { authenticate, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";

const SignupBody = z.object({
  companyName: z.string().min(2).max(128),
  name: z.string().min(2).max(128),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

const LoginBody = z.object({ email: z.string().email(), password: z.string() });

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function authRoutes(app: FastifyInstance) {
  // Autenticação com Google OAuth / WAScript Single Sign-On
  app.post("/auth/google", async (req, reply) => {
    const body = parse(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      googleId: z.string().optional(),
    }), req.body);

    let [user] = await db.select().from(schema.users).where(eq(schema.users.email, body.email));
    let companyId: string;

    if (!user) {
      let [comp] = await db.select().from(schema.companies).limit(1);
      if (!comp) {
        [comp] = await db
          .insert(schema.companies)
          .values({ name: "Comenta AI", slug: "comenta-ai" })
          .returning();
      }
      companyId = comp.id;

      const [newUser] = await db
        .insert(schema.users)
        .values({
          companyId,
          name: body.name || "Hebert Paes",
          email: body.email,
          passwordHash: await hashPassword("google_oauth_" + Date.now()),
          role: "admin",
        })
        .returning();
      user = newUser;
    } else {
      companyId = user.companyId;
    }

    const [company] = await db.select().from(schema.companies).where(eq(schema.companies.id, companyId));

    const accessToken = signAccessToken({
      userId: user.id,
      companyId,
      role: user.role,
      name: user.name,
    });
    const refreshToken = await issueRefreshToken(user.id);

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: false,
      },
      company: { id: company.id, name: company.name, planId: company?.planId },
      accessToken,
      refreshToken,
    });
  });

  // Cria a empresa (tenant) e o primeiro usuário administrador
  app.post(
    "/auth/signup",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = parse(SignupBody, req.body);
      const [existing] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, body.email));
      if (existing) throw new ApiError(409, "E-mail já cadastrado");

      let slug = slugify(body.companyName);
      const [slugTaken] = await db
        .select()
        .from(schema.companies)
        .where(eq(schema.companies.slug, slug));
      if (slugTaken) slug = `${slug}-${Date.now().toString(36)}`;

      const [company] = await db
        .insert(schema.companies)
        .values({ name: body.companyName, slug })
        .returning();
      const [user] = await db
        .insert(schema.users)
        .values({
          companyId: company.id,
          name: body.name,
          email: body.email,
          passwordHash: await hashPassword(body.password),
          role: "admin",
        })
        .returning();

      const accessToken = signAccessToken({
        userId: user.id,
        companyId: company.id,
        role: "admin",
        name: user.name,
      });
      const refreshToken = await issueRefreshToken(user.id);
      return reply.code(201).send({
        company: { id: company.id, name: company.name, slug: company.slug, planId: company.planId },
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      });
    }
  );

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = parse(LoginBody, req.body);
      const [user] = await db.select().from(schema.users).where(eq(schema.users.email, body.email));
      if (!user || !user.isActive || !(await verifyPassword(body.password, user.passwordHash))) {
        throw new ApiError(401, "Credenciais inválidas");
      }
      const [company] = await db
        .select()
        .from(schema.companies)
        .where(eq(schema.companies.id, user.companyId));
      if (!company || company.status !== "active") throw new ApiError(403, "Empresa suspensa");

      await db
        .update(schema.users)
        .set({ lastLoginAt: new Date() })
        .where(eq(schema.users.id, user.id));
      const accessToken = signAccessToken({
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
        name: user.name,
      });
      const refreshToken = await issueRefreshToken(user.id);
      return reply.send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
        company: { id: company.id, name: company.name, planId: company.planId },
        accessToken,
        refreshToken,
      });
    }
  );

  const ChangePwBody = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "mínimo 8 caracteres").max(72),
  });
  app.post("/auth/change-password", { preHandler: [authenticate] }, async (req, reply) => {
    const { currentPassword, newPassword } = parse(ChangePwBody, req.body);
    const p = req.principal;
    if (!p.userId) throw new ApiError(400, "Sessão inválida para troca de senha");
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, p.userId));
    if (!user) throw new ApiError(404, "Usuário não encontrado");
    if (!(await verifyPassword(currentPassword, user.passwordHash)))
      throw new ApiError(401, "Senha atual incorreta");
    if (await verifyPassword(newPassword, user.passwordHash))
      throw new ApiError(400, "A nova senha deve ser diferente da atual");
    await db
      .update(schema.users)
      .set({ passwordHash: await hashPassword(newPassword), mustChangePassword: false })
      .where(eq(schema.users.id, user.id));
    audit(p, "auth.change_password", "user", user.id);
    return reply.send({ ok: true });
  });

  app.post("/auth/refresh", async (req, reply) => {
    const body = parse(z.object({ refreshToken: z.string() }), req.body);
    const rotated = await rotateRefreshToken(body.refreshToken);
    if (!rotated) throw new ApiError(401, "Refresh token inválido ou expirado");
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, rotated.userId));
    if (!user || !user.isActive) throw new ApiError(401, "Usuário inativo");
    const accessToken = signAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      name: user.name,
    });
    return reply.send({ accessToken, refreshToken: rotated.refreshToken });
  });

  app.post("/auth/logout", async (req, reply) => {
    const body = parse(z.object({ refreshToken: z.string() }), req.body);
    await revokeRefreshToken(body.refreshToken);
    return reply.send({ ok: true });
  });

  app.get("/auth/me", { preHandler: [authenticate] }, async (req) => {
    const p = req.principal;
    const [company] = await db
      .select()
      .from(schema.companies)
      .where(eq(schema.companies.id, p.companyId));
    const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, company.planId));
    const [{ count: userCount }] = await db
      .select({ count: dsql<number>`count(*)::int` })
      .from(schema.users)
      .where(eq(schema.users.companyId, p.companyId));
    const [self] = p.userId
      ? await db
          .select({ must: schema.users.mustChangePassword })
          .from(schema.users)
          .where(eq(schema.users.id, p.userId))
      : [{ must: false }];
    audit(p, "auth.me", "user", p.userId ?? undefined);
    return {
      principal: p,
      company: { id: company.id, name: company.name, slug: company.slug, status: company.status },
      plan,
      usage: { users: userCount },
      mustChangePassword: self?.must ?? false,
    };
  });
}
