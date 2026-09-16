import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { config } from "./config.js";
import { db, schema } from "./db/client.js";

export const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

// bullmq empacota a própria cópia do ioredis; em runtime a conexão é a mesma,
// só os tipos divergem — daí o cast pontual.
const connection = redis as unknown as ConnectionOptions;

const webhookQueue = new Queue("webhooks", { connection });

/**
 * Publica um evento de domínio: grava as entregas pendentes e agenda o envio
 * com retry exponencial para cada webhook inscrito no evento.
 */
export async function publishEvent(companyId: string, event: string, payload: unknown) {
  const hooks = await db
    .select()
    .from(schema.webhooks)
    .where(and(eq(schema.webhooks.companyId, companyId), eq(schema.webhooks.isActive, true)));

  for (const hook of hooks) {
    if (hook.events.length > 0 && !hook.events.includes(event)) continue;
    const [delivery] = await db
      .insert(schema.webhookDeliveries)
      .values({ webhookId: hook.id, event, payload: payload as object })
      .returning();
    await webhookQueue.add(
      "deliver",
      { deliveryId: delivery.id, url: hook.url, secret: hook.secret, event, payload },
      { attempts: 5, backoff: { type: "exponential", delay: 3000 }, removeOnComplete: 100 }
    );
  }
}

export function startWorkers() {
  new Worker(
    "webhooks",
    async (job) => {
      const { deliveryId, url, secret, event, payload } = job.data;
      const body = JSON.stringify({ event, data: payload, sentAt: new Date().toISOString() });
      const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Comenta-Event": event,
            "X-Comenta-Signature": `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await db
          .update(schema.webhookDeliveries)
          .set({ status: "success", attempts: job.attemptsMade + 1 })
          .where(eq(schema.webhookDeliveries.id, deliveryId));
      } catch (err) {
        await db
          .update(schema.webhookDeliveries)
          .set({
            status: "failed",
            attempts: job.attemptsMade + 1,
            lastError: (err as Error).message,
          })
          .where(eq(schema.webhookDeliveries.id, deliveryId));
        throw err;
      }
    },
    { connection }
  );
}
