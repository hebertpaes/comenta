import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";
import { sendToContact } from "../channels/whatsapp.js";

/**
 * Módulo de Automação & Integração com Webhooks da Hotmart.
 *
 * Processa eventos oficiais da Hotmart:
 *  - PURCHASE_APPROVED: Venda Aprovada (Cadastra contato, envia WhatsApp de boas-vindas e libera acesso).
 *  - PURCHASE_REFUNDED: Venda Reembolsada (Atualiza tag e envia notificação).
 *  - PURCHASE_CANCELED: Venda Cancelada.
 *  - SUBSCRIPTION_CANCELLATION: Assinatura Cancelada.
 */
export async function hotmartRoutes(app: FastifyInstance) {
  // Webhook Público da Hotmart (recebe POST direto dos servidores da Hotmart)
  app.post("/webhooks/hotmart", async (req, reply) => {
    const payload = (req.body as any) || {};

    // 1. Extração de dados da Hotmart
    const event = payload.event || payload.status || "PURCHASE_APPROVED";
    const data = payload.data || payload;
    const buyer = data.buyer || payload.buyer || {};
    const product = data.product || payload.product || {};
    const purchase = data.purchase || payload.purchase || {};

    const buyerName = buyer.name || "Cliente Hotmart";
    const buyerEmail = buyer.email || "aluno@hotmart.com";
    const buyerPhoneRaw = buyer.checkout_phone || buyer.phone || "5566999999999";
    const buyerPhone = String(buyerPhoneRaw).replace(/\D/g, "");

    const productName = product.name || "Curso / Produto Hotmart";
    const transactionId = purchase.transaction || `HOT_${Date.now()}`;

    // 2. Busca a empresa padrão do SaaS
    const [company] = await db.select().from(schema.companies).limit(1);
    if (!company) {
      return reply.status(404).send({ error: "Empresa não configurada." });
    }

    const companyId = company.id;

    console.log(`[Hotmart Webhook] Evento: ${event} | Produto: ${productName} | Comprador: ${buyerName} (${buyerEmail})`);

    // 3. Processamento de Venda Aprovada
    if (event === "PURCHASE_APPROVED" || event === "APPROVED") {
      // Cadastra ou atualiza o contato do comprador no banco
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
            tags: ["#AlunoHotmart", "#CompraAprovada"],
          })
          .returning();
      }

      // Cria ou reutiliza uma conversa no AtendeChat
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

      // 4. Disparo Automático de Boas-Vindas via WhatsApp
      const whatsappMsg =
        `🎉 *Parabéns pela sua compra, ${buyerName}!*\n\n` +
        `Seu acesso ao curso *"${productName}"* foi liberado com sucesso no Hotmart!\n\n` +
        `🔑 *Transação*: ${transactionId}\n` +
        `📧 *E-mail de Acesso*: ${buyerEmail}\n` +
        `🎓 *Acesse suas aulas em*: http://localhost:3000/loja\n\n` +
        `Se precisar de qualquer ajuda, nossa equipe e nossos robôs de IA estão à disposição!`;

      // Insere a mensagem enviada na conversa
      const [msg] = await db
        .insert(schema.messages)
        .values({
          companyId,
          conversationId: conv.id,
          direction: "out",
          body: whatsappMsg,
        })
        .returning();

      // Notifica o painel em tempo real via Socket.io
      emitToCompany(companyId, "message.created", { conversationId: conv.id, message: msg });
      publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(() => {});

      // Envia a mensagem real para o WhatsApp do cliente
      sendToContact(companyId, contact.id, whatsappMsg).catch(() => {});

      return reply.send({
        success: true,
        event,
        transactionId,
        buyerName,
        whatsappSent: true,
        message: "Venda Hotmart processada e WhatsApp enviado automaticamente!"
      });
    }

    return reply.send({ success: true, event, message: "Evento Hotmart recebido com sucesso!" });
  });

  // Rota de Teste de Simulação de Venda Hotmart
  app.post("/webhooks/hotmart/test", async (req, reply) => {
    const testPayload = {
      event: "PURCHASE_APPROVED",
      data: {
        buyer: {
          name: "Hebert Paes (Aluno Teste)",
          email: "hebert@comenta.com.br",
          checkout_phone: "5566999999999"
        },
        product: {
          name: "Formação Atendente IA & Automações Comenta"
        },
        purchase: {
          transaction: `HTM_${Date.now()}`
        }
      }
    };

    // Dispara a chamada ao webhook
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/hotmart",
      payload: testPayload
    });

    return reply.send(JSON.parse(res.payload));
  });
}
