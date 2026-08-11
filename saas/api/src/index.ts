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
import { aiTrainingRoutes } from "./modules/ai-training.js";
import { aiProviderRoutes } from "./modules/ai-providers.js";
import { hotmartRoutes } from "./modules/hotmart.js";
import { abacsRoutes } from "./modules/abacs.js";
import { flowbuilderRoutes } from "./modules/flowbuilder.js";
import { channelRoutes } from "./modules/channels.js";
import { metaWebhookRoutes } from "./modules/meta-webhooks.js";
import { widgetRoutes } from "./modules/widget.js";
import { automationRoutes } from "./modules/automations.js";
import { courseRoutes } from "./modules/courses.js";
import { queueRoutes } from "./modules/queues.js";
import { toolkitRoutes } from "./modules/toolkit.js";
import { campaignRoutes, startCampaignScheduler } from "./modules/campaigns.js";
import { ratingRoutes } from "./modules/ratings.js";
import { teamRoutes } from "./modules/team.js";
import { settingsRoutes } from "./modules/settings.js";
import { restoreSessions } from "./channels/whatsapp.js";

const app = Fastify({
  logger: { level: config.NODE_ENV === "production" ? "info" : "debug" },
  bodyLimit: 1_000_000,
});

await app.register(cors, { origin: corsOrigins, credentials: true });
await app.register(rateLimit, { max: 300, timeWindow: "1 minute", redis });

// Aceita corpo JSON vazio: alguns POSTs (ex.: conectar/desconectar WhatsApp)
// mandam Content-Type: application/json sem body. O parser padrão do Fastify
// rejeitaria com FST_ERR_CTP_EMPTY_JSON_BODY; aqui tratamos vazio como {}.
app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
  const raw = (body as string) ?? "";
  // Guarda o corpo CRU: o webhook da Meta assina exatamente estes bytes, e
  // reserializar o JSON (espaços, ordem de chaves) faria o HMAC não fechar.
  (req as { rawBody?: string }).rawBody = raw;
  if (raw.trim() === "") return done(null, {});
  try {
    done(null, JSON.parse(raw));
  } catch (err) {
    (err as { statusCode?: number }).statusCode = 400;
    done(err as Error, undefined);
  }
});
await app.register(swagger, {
  openapi: {
    info: {
      title: "Comenta SaaS API",
      version: "1.0.0",
      description: "API de atendimento multicanal — comenta.com.br",
    },
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
  if (err instanceof ApiError)
    return reply.code(err.statusCode).send({ error: err.message, code: err.code });
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
await app.register(aiTrainingRoutes);
await app.register(aiProviderRoutes);
await app.register(hotmartRoutes);
await app.register(abacsRoutes);
await app.register(flowbuilderRoutes);
await app.register(channelRoutes);
await app.register(metaWebhookRoutes);
await app.register(widgetRoutes);
await app.register(automationRoutes);
await app.register(courseRoutes);
await app.register(queueRoutes);
await app.register(toolkitRoutes);
await app.register(campaignRoutes);
await app.register(ratingRoutes);
await app.register(teamRoutes);
await app.register(settingsRoutes);

// socket.io compartilha o mesmo servidor HTTP
const server = createServer();
initRealtime(server);
await app.ready();
server.on("request", (req, res) => app.routing(req, res));

startWorkers();
// Restaura sessões de WhatsApp previamente pareadas (credenciais em disco).
restoreSessions().catch(() => {});
startCampaignScheduler();
server.listen(config.PORT, "0.0.0.0", () => {
  app.log.info(
    `Comenta API on :${config.PORT} — docs em /docs — IA ${aiEnabled() ? "ativa" : "inativa"}`
  );
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
