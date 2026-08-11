import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate, requireAdmin, parse, ApiError } from "../lib/http.js";
import { audit } from "../lib/audit.js";

const WEBHOOK_EVENTS = ["conversation.created", "message.created", "conversation.updated"] as const;

export async function webhookRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireAdmin);

  app.get("/webhooks", async (req) => {
    const rows = await db
      .select({
        id: schema.webhooks.id,
        url: schema.webhooks.url,
        events: schema.webhooks.events,
        isActive: schema.webhooks.isActive,
        createdAt: schema.webhooks.createdAt,
      })
      .from(schema.webhooks)
      .where(eq(schema.webhooks.companyId, req.principal.companyId));
    return { data: rows, availableEvents: WEBHOOK_EVENTS };
  });

  app.post("/webhooks", async (req, reply) => {
    const body = parse(
      z.object({
        url: z.string().url(),
        events: z.array(z.enum(WEBHOOK_EVENTS)).default([]),
      }),
      req.body
    );
    const secret = `whsec_${crypto.randomBytes(24).toString("base64url")}`;
    const [row] = await db
      .insert(schema.webhooks)
      .values({ companyId: req.principal.companyId, url: body.url, secret, events: body.events })
      .returning();
    audit(req.principal, "webhook.created", "webhook", row.id, { url: body.url });
    // segredo exibido só uma vez — usado para validar a assinatura HMAC-SHA256
    return reply.code(201).send({ id: row.id, url: row.url, events: row.events, secret });
  });

  app.delete("/webhooks/:id", async (req, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [row] = await db
      .delete(schema.webhooks)
      .where(
        and(eq(schema.webhooks.id, id), eq(schema.webhooks.companyId, req.principal.companyId))
      )
      .returning();
    if (!row) throw new ApiError(404, "Webhook não encontrado");
    audit(req.principal, "webhook.deleted", "webhook", id);
    return reply.code(204).send();
  });

  app.get("/webhooks/:id/deliveries", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const [hook] = await db
      .select()
      .from(schema.webhooks)
      .where(
        and(eq(schema.webhooks.id, id), eq(schema.webhooks.companyId, req.principal.companyId))
      );
    if (!hook) throw new ApiError(404, "Webhook não encontrado");
    const rows = await db
      .select({
        id: schema.webhookDeliveries.id,
        event: schema.webhookDeliveries.event,
        status: schema.webhookDeliveries.status,
        attempts: schema.webhookDeliveries.attempts,
        lastError: schema.webhookDeliveries.lastError,
        createdAt: schema.webhookDeliveries.createdAt,
      })
      .from(schema.webhookDeliveries)
      .where(eq(schema.webhookDeliveries.webhookId, id))
      .limit(50);
    return { data: rows };
  });
}
