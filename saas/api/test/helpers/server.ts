import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { ApiError } from "../../src/lib/http.js";
import { authRoutes } from "../../src/modules/auth.js";
import { contactRoutes } from "../../src/modules/contacts.js";
import { conversationRoutes } from "../../src/modules/conversations.js";
import { queueRoutes } from "../../src/modules/queues.js";
import { userRoutes } from "../../src/modules/users.js";

/**
 * Sobe a API em memória para os testes de integração.
 *
 * Registra só os módulos exercitados aqui e replica o error handler do
 * `src/index.ts` — assim os testes veem os mesmos códigos de status que o
 * cliente veria. Deliberadamente sem Redis, sem workers, sem socket.io e sem o
 * rate limit: nada disso participa das regras que estes testes verificam, e
 * exigir a infra toda tornaria o teste frágil por motivos alheios.
 */
export async function buildTestServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    const raw = (body as string) ?? "";
    if (raw.trim() === "") return done(null, {});
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      (err as { statusCode?: number }).statusCode = 400;
      done(err as Error, undefined);
    }
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError)
      return reply.code(err.statusCode).send({ error: err.message, code: err.code });
    // `detail` só existe aqui, não em produção: quando um teste falha com 500,
    // ver a mensagem original economiza muito tempo de investigação.
    const detail = err instanceof Error ? err.message : String(err);
    return reply.code(500).send({ error: "Erro interno", detail });
  });

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(contactRoutes);
  await app.register(conversationRoutes);
  await app.register(queueRoutes);

  await app.ready();
  return app;
}

/** Cria uma empresa nova com um admin, devolvendo o token para autenticar. */
export async function signupCompany(
  app: FastifyInstance,
  opts: { companyName: string; name: string; email: string; password?: string }
) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: {
      companyName: opts.companyName,
      name: opts.name,
      email: opts.email,
      password: opts.password ?? "senha-de-teste-123",
    },
  });
  if (res.statusCode !== 201) {
    throw new Error(`signup falhou (${res.statusCode}): ${res.body}`);
  }
  const body = res.json() as {
    accessToken: string;
    refreshToken: string;
    company: { id: string };
    user: { id: string };
  };
  return {
    token: body.accessToken,
    refreshToken: body.refreshToken,
    companyId: body.company.id,
    userId: body.user.id,
    auth: { authorization: `Bearer ${body.accessToken}` },
  };
}
