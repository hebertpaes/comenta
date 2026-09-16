import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { generateApiKey } from "../lib/auth.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";

export async function apiKeyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireAdmin);

  app.get("/api-keys", async (req) => {
    const rows = await db
      .select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        prefix: schema.apiKeys.prefix,
        lastUsedAt: schema.apiKeys.lastUsedAt,
        revokedAt: schema.apiKeys.revokedAt,
        createdAt: schema.apiKeys.createdAt,
      })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.companyId, req.principal.companyId));
    return { data: rows };
  });

  app.post("/api-keys", async (req, reply) => {
    const { name } = parse(z.object({ name: z.string().min(1).max(64) }), req.body);
    const { plain, prefix, keyHash } = generateApiKey();
    const [row] = await db
      .insert(schema.apiKeys)
      .values({ companyId: req.principal.companyId, name, prefix, keyHash })
      .returning();
    audit(req.principal, "apikey.created", "api_key", row.id, { name });
    // key exibida só uma vez
    return reply.code(201).send({ id: row.id, name, prefix, key: plain });
  });

  app.delete("/api-keys/:id", async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .update(schema.apiKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.apiKeys.id, id),
          eq(schema.apiKeys.companyId, req.principal.companyId),
          isNull(schema.apiKeys.revokedAt)
        )
      )
      .returning();
    if (!row) throw new ApiError(404, "Chave não encontrada");
    audit(req.principal, "apikey.revoked", "api_key", id);
    return reply.code(204).send();
  });
}
