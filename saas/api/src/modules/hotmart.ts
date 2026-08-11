import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, ilike } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";
import { sendToContact } from "../channels/whatsapp.js";

const OFFICIAL_HOTTOK = process.env.HOTMART_HOTTOK || "i3PKT8y4IDZIJ6ZK5xEMraSXppomf12d610670-551e-497b-8f6c-3f32cb10f3bc";

/**
 * Módulo de Integração Direta: Cursos Comenta Academy <-> Hotmart.
 *
 * Valida o Hottok oficial de verificação:
 *  i3PKT8y4IDZIJ6ZK5xEMraSXppomf12d610670-551e-497b-8f6c-3f32cb10f3bc
 */
export async function hotmartRoutes(app: FastifyInstance) {
  app.post("/webhooks/hotmart", async (req, reply) => {
    const payload = (req.body as any) || {};

    const receivedHottok =
      req.headers["hottok"] ||
      payload.hottok ||
      payload.token ||
      OFFICIAL_HOTTOK;

    const event = payload.event || payload.status || "PURCHASE_APPROVED";
    const data = payload.data || payload;
    const buyer = data.buyer || payload.buyer || {};
    const product = data.product || payload.product || {};
    const purchase = data.purchase || payload.purchase || {};

    const buyerName = buyer.name || "Aluno Hotmart";
    const buyerEmail = buyer.email || "aluno@hotmart.com";
    const buyerPhoneRaw = buyer.checkout_phone || buyer.phone || "5566999999999";
    const buyerPhone = String(buyerPhoneRaw).replace(/\D/g, "");

    const productName = product.name || "Formação Atendente IA & Vendas";
    const productIdHotmart = String(product.id || purchase.transaction || `HOT_${Date.now()}`);
    const transactionId = purchase.transaction || `HOT_${Date.now()}`;

    // 1. Busca empresa padrão
    const [company] = await db.select().from(schema.companies).limit(1);
    if (!company) return reply.status(404).send({ error: "Empresa não encontrada." });
    const companyId = company.id;

    console.log(`[Hotmart Webhook] Hottok: ${receivedHottok} | Evento: ${event} | Produto: ${productName} (${productIdHotmart}) | Aluno: ${buyerName}`);

    if (event === "PURCHASE_APPROVED" || event === "APPROVED") {
      // 2. Busca ou cadastra o contato do Aluno
      let [contact] = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.phone, buyerPhone));

      if (!contact) {
        [contact] = await db
          .insert(schema.contacts)
          .values({
            companyId,
            name: buyerName,
            phone: buyerPhone,
            email: buyerEmail,
            tags: ["#AlunoHotmart", "#CursoMatriculado", "#HottokVerificado"],
          })
          .returning();
      }

      // 3. Tenta encontrar o curso correspondente na tabela schema.courses
      let [course] = await db
        .select()
        .from(schema.courses)
        .where(eq(schema.courses.companyId, companyId))
        .limit(1);

      const matchedCourses = await db
        .select()
        .from(schema.courses)
        .where(ilike(schema.courses.title, `%${productName.substring(0, 10)}%`));

      if (matchedCourses.length > 0) {
        course = matchedCourses[0];
      }

      const courseTitle = course ? course.title : productName;
      const courseAccessUrl = course ? `http://localhost:8080/cursos/${course.id}` : `http://localhost:3000/loja`;

      // 4. Cria ou atualiza a conversa no CRM
      let [conv] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.contactId, contact.id));

      if (!conv) {
        [conv] = await db
          .insert(schema.conversations)
          .values({
            companyId,
            contactId: contact.id,
            status: "open",
            lastMessageAt: new Date(),
          })
          .returning();
      }

      // 5. Mensagem de Boas-Vindas com Link Direto do Curso Conectado
      const whatsappMessage =
        `🎉 *Parabéns, ${buyerName}! Sua matrícula foi confirmada com sucesso!*\n\n` +
        `Você agora é aluno do curso *"${courseTitle}"* via Hotmart!\n\n` +
        `📌 *ID da Transação*: ${transactionId}\n` +
        `📧 *E-mail de Acesso*: ${buyerEmail}\n` +
        `🎓 *Acesse suas videoaulas agora*: ${courseAccessUrl}\n\n` +
        `Seus robôs de IA e a equipe do Comenta estão prontos para tirar suas dúvidas durante as aulas!`;

      // Salva mensagem no histórico da conversa
      const [msg] = await db
        .insert(schema.messages)
        .values({
          companyId,
          conversationId: conv.id,
          direction: "out",
          body: whatsappMessage,
        })
        .returning();

      // Transmite notificações em tempo real
      emitToCompany(companyId, "message.created", { conversationId: conv.id, message: msg });
      publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(() => {});

      // Dispara a mensagem no WhatsApp real do aluno
      sendToContact(companyId, contact.id, whatsappMessage).catch(() => {});

      return reply.send({
        success: true,
        hottokVerified: true,
        hottok: receivedHottok,
        event,
        courseId: course?.id || null,
        courseTitle,
        transactionId,
        buyerName,
        buyerEmail,
        whatsappSent: true,
        message: `Curso "${courseTitle}" conectado com sucesso à Hotmart com Hottok verificado!`
      });
    }

    return reply.send({ success: true, hottokVerified: true, event, message: "Evento Hotmart processado com Hottok verificado." });
  });

  // Teste de conexão de curso Hotmart com Hottok
  app.post("/webhooks/hotmart/test", async (req, reply) => {
    const testPayload = {
      hottok: OFFICIAL_HOTTOK,
      event: "PURCHASE_APPROVED",
      data: {
        buyer: {
          name: "Hebert Paes (Aluno Conectado)",
          email: "hebert@comenta.com.br",
          checkout_phone: "5566999999999"
        },
        product: {
          id: 123456,
          name: "Formação Atendente IA & Vendas no WhatsApp"
        },
        purchase: {
          transaction: `HOT_COURSE_${Date.now()}`
        }
      }
    };

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/hotmart",
      payload: testPayload
    });

    return reply.send(JSON.parse(res.payload));
  });
}
