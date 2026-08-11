import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError, type ZodType } from "zod";
import { verifyAccessToken, verifyApiKey, type Principal } from "./auth.js";

declare module "fastify" {
  interface FastifyRequest {
    principal: Principal;
  }
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = "error"
  ) {
    super(message);
  }
}

/** Autentica via Bearer JWT (painel) ou X-API-Key (integrações). */
export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string" && apiKey.length > 0) {
    const p = await verifyApiKey(apiKey);
    if (!p) return reply.code(401).send({ error: "API key inválida ou revogada" });
    req.principal = p;
    return;
  }
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      req.principal = verifyAccessToken(auth.slice(7));
      return;
    } catch {
      return reply.code(401).send({ error: "Token expirado ou inválido" });
    }
  }
  return reply.code(401).send({ error: "Autenticação necessária" });
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if (req.principal.role !== "admin" && req.principal.role !== "api") {
    return reply.code(403).send({ error: "Apenas administradores" });
  }
}

export function parse<S extends ZodType>(schema: S, data: unknown): z.infer<S> {
  try {
    return schema.parse(data) as z.infer<S>;
  } catch (e) {
    if (e instanceof ZodError) {
      const detail = e.errors.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new ApiError(400, `Dados inválidos — ${detail}`, "validation");
    }
    throw e;
  }
}

export const paginated = (page: number, perPage: number) => ({
  limit: Math.min(Math.max(perPage, 1), 100),
  offset: (Math.max(page, 1) - 1) * Math.min(Math.max(perPage, 1), 100),
});
