import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { createServer } from "node:http";
import { config, corsOrigins } from "./config.js";
import { sql } from "./db/client.js";
import { redis, startWorkers } from "./queues.js";
import { initRealtime } from "./realtime.js";
import { ApiError } from "./lib/http.js";
import { aiEnabled } from "./lib/ai.js";
import { authRoutes } from "./modules/auth.js";
import { userRoutes } from "./modules/users.js";
import { contactRoutes } from "./modules/contacts.js";
import { conversationRoutes } from "./modules/conversations.js";
import { apiKeyRoutes } from "./modules/apikeys.js";
import { webhookRoutes } from "./modules/webhooks.js";
import { aiRoutes } from "./modules/ai.js";
import { channelRoutes } from "./modules/channels.js";
import { widgetRoutes } from "./modules/widget.js";

const app = Fastify({
  logger: { level: config.NODE_ENV === "production" ? "info" : "debug" },
  bodyLimit: 1_000_000,
});

await app.register(cors, { origin: corsOrigins, credentials: true });
await app.register(rateLimit, { max: 300, timeWindow: "1 minute", redis });
await app.register(swagger, {
  openapi: {
    info: { title: "Comenta SaaS API", version: "1.0.0", description: "API de atendimento multicanal — comenta.com.br" },
    servers: [{ url: config.API_URL }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        apiKey: { type: "apiKey", in: "header", name: "X-API-Key" },
      },
    },
  },
});
await app.register(swaggerUi, { routePrefix: "/docs" });

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof ApiError) return reply.code(err.statusCode).send({ error: err.message, code: err.code });
  if ((err as { statusCode?: number }).statusCode === 429)
    return reply.code(429).send({ error: "Muitas requisições — tente novamente em instantes" });
  app.log.error(err);
  return reply.code(500).send({ error: "Erro interno" });
});

// health / readiness
app.get("/health", async () => ({ status: "ok", ai: aiEnabled() }));
app.get("/ready", async (_req, reply) => {
  try {
    await sql`select 1`;
    await redis.ping();
    return { status: "ready" };
  } catch {
    return reply.code(503).send({ status: "not-ready" });
  }
});

// módulos
await app.register(authRoutes);
await app.register(userRoutes);
await app.register(contactRoutes);
await app.register(conversationRoutes);
await app.register(apiKeyRoutes);
await app.register(webhookRoutes);
await app.register(aiRoutes);
await app.register(channelRoutes);
await app.register(widgetRoutes);

// socket.io compartilha o mesmo servidor HTTP
const server = createServer();
initRealtime(server);
await app.ready();
server.on("request", (req, res) => app.routing(req, res));

startWorkers();
server.listen(config.PORT, "0.0.0.0", () => {
  app.log.info(`Comenta API on :${config.PORT} — docs em /docs — IA ${aiEnabled() ? "ativa" : "inativa"}`);
});

const shutdown = async () => {
  await app.close();
  server.close();
  await sql.end();
  await redis.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
