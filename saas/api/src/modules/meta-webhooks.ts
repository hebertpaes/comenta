import type { FastifyInstance } from "fastify";
import * as meta from "../channels/meta.js";

/**
 * Webhook público da Meta (Instagram Direct + Facebook Messenger).
 *
 * Rotas SEM autenticação de propósito — quem chama é a Meta, que não tem como
 * apresentar JWT nem API key. O que prova a origem é a assinatura HMAC do
 * corpo, conferida em `meta.receber`. Por isso este módulo NÃO registra o
 * `preHandler: authenticate` que os demais usam.
 *
 * URL a cadastrar no painel da Meta:
 *   https://api.SEU-DOMINIO/webhooks/meta
 */
export async function metaWebhookRoutes(app: FastifyInstance) {
  // Handshake de assinatura: a Meta chama uma vez e espera o challenge de volta
  // como texto puro. Qualquer JSON aqui faz a verificação falhar no painel dela.
  app.get("/webhooks/meta", async (req, reply) => {
    const challenge = await meta.verifyChallenge(req.query as Record<string, unknown>);
    if (challenge === null) return reply.code(403).send({ error: "Token de verificação inválido" });
    return reply.type("text/plain").send(challenge);
  });

  // Entrega de eventos.
  app.post("/webhooks/meta", async (req, reply) => {
    const raw = (req as { rawBody?: string }).rawBody ?? "";
    const assinatura = req.headers["x-hub-signature-256"];
    const res = await meta.receber(
      raw,
      typeof assinatura === "string" ? assinatura : undefined,
      req.body
    );

    if (!res.ok) {
      req.log.warn({ motivo: res.motivo }, "webhook da Meta recusado");
      return reply.code(403).send({ error: res.motivo });
    }

    // A Meta reenvia o evento por até 36h se não receber 200 rápido. Devolvemos
    // 200 mesmo quando nada foi registrado (evento sem texto, página de outra
    // instalação): o reenvio não mudaria o resultado.
    return reply.code(200).send({ received: res.registradas });
  });
}
