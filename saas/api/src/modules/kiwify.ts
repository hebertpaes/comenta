import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { audit } from "../lib/audit.js";

/**
 * Módulo de Integração com o Portal Kiwify / AtendeChat (https://curso.atendechat.com/)
 */

export async function kiwifyRoutes(app: FastifyInstance) {
  // Webhook Kiwify para Alunos do AtendeChat
  app.all("/webhooks/kiwify", async (req, reply) => {
    const body = (req.body as Record<string, any>) || {};

    const event = body.order_status || body.event || "approved";
    const email = body.Customer?.email || body.email || "aluno@atendechat.com";
    const name = body.Customer?.full_name || body.name || "Aluno Kiwify AtendeChat";
    const phone = body.Customer?.mobile || body.phone || "";
    const productName = body.Product?.product_name || "Curso AtendeChat SaaS";

    const [comp] = await db.select({ id: schema.companies.id }).from(schema.companies).limit(1);
    if (!comp) return reply.code(400).send({ error: "Nenhuma empresa cadastrada." });

    if (event === "paid" || event === "approved" || event === "completed") {
      let [contact] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.email, email.toLowerCase().trim()));

      const tags = ["#AlunoKiwify", "#AtendeChatCurso", "#KiwifyIntegrado"];

      if (!contact) {
        [contact] = await db
          .insert(schema.contacts)
          .values({
            companyId: comp.id,
            name,
            email: email.toLowerCase().trim(),
            phone: phone.replace(/\D/g, "") || null,
            tags,
          })
          .returning();
      } else {
        const currentTags = (contact.tags as string[]) || [];
        const mergedTags = Array.from(new Set([...currentTags, ...tags]));
        await db
          .update(schema.contacts)
          .set({ tags: mergedTags })
          .where(eq(schema.contacts.id, contact.id));
      }

      audit({ companyId: comp.id, userId: null, role: "admin", name: "Kiwify Webhook" }, "kiwify.sale_approved", "contact", contact.id, {
        productName,
        email,
        portalUrl: "https://curso.atendechat.com/"
      });
    }

    return reply.send({
      status: "success",
      message: "Webhook Kiwify AtendeChat processado com sucesso!",
      portalUrl: "https://curso.atendechat.com/",
      timestamp: new Date().toISOString()
    });
  });
}
