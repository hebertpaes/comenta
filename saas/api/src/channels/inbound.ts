import { and, desc, eq, ne } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";

type Contact = typeof schema.contacts.$inferSelect;

/**
 * Resolve (ou cria) o contato de um canal que NÃO identifica por telefone.
 *
 * Instagram, Messenger, YouTube e X entregam apenas um id opaco da pessoa —
 * nunca telefone nem e-mail. O `externalId` é, então, a única chave para
 * reconhecer quem voltou a escrever, e vem prefixado pelo canal (`yt:`, `x:`)
 * para que o mesmo número numa plataforma não seja confundido com o de outra.
 */
export async function resolverContatoExterno(
  companyId: string,
  externalId: string,
  tag: string,
  nome: string
): Promise<Contact> {
  const [existente] = await db
    .select()
    .from(schema.contacts)
    .where(
      and(eq(schema.contacts.companyId, companyId), eq(schema.contacts.externalId, externalId))
    );
  if (existente) return existente;

  const [novo] = await db
    .insert(schema.contacts)
    .values({ companyId, name: nome, externalId, tags: [tag] })
    .returning();
  return novo;
}

/**
 * Registra uma mensagem que CHEGOU de um contato, seja qual for o canal:
 * reaproveita a conversa aberta (ou abre uma), grava a mensagem, atualiza o
 * contador de não-lidas, emite os eventos de tempo real e dispara as
 * automações.
 *
 * Identificar o contato é responsabilidade de cada canal — o WhatsApp resolve
 * por telefone, a Meta por PSID/IGSID — porque só o canal sabe o que identifica
 * uma pessoa nele. Daqui para baixo o fluxo é idêntico, então mora aqui em vez
 * de ser copiado em cada adaptador.
 *
 * `channelId` amarra a conversa à conexão de origem. É o que faz a resposta do
 * atendente voltar pela mesma página/conta (ver deliverOutbound). O WhatsApp
 * passa null de propósito: lá o envio usa qualquer sessão conectada da empresa.
 *
 * `externalRef` é o alvo de resposta no provedor quando responder exige apontar
 * para a mensagem original (thread do YouTube, tweet do X). Ele é reescrito a
 * cada mensagem que chega: a resposta do atendente pertence à ÚLTIMA coisa que
 * o cliente disse, não à primeira da conversa.
 */
export async function recordInbound(
  companyId: string,
  contact: Contact,
  body: string,
  channelId: string | null = null,
  externalRef: string | null = null
) {
  // Se a conversa anterior está aguardando avaliação, esta resposta pode ser a
  // nota do cliente — nesse caso consumimos a mensagem e não abrimos uma nova.
  const consumed = await import("../modules/ratings.js")
    .then((m) => m.tryCaptureRating(companyId, contact.id, body))
    .catch(() => false);
  if (consumed) return;

  let [conv] = await db
    .select()
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.companyId, companyId),
        eq(schema.conversations.contactId, contact.id),
        ne(schema.conversations.status, "resolved")
      )
    )
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(1);

  let created = false;
  if (!conv) {
    [conv] = await db
      .insert(schema.conversations)
      .values({
        companyId,
        contactId: contact.id,
        channelId,
        externalRef,
        status: "pending",
        unreadCount: 0,
        lastMessageAt: new Date(),
      })
      .returning();
    created = true;
  }

  const [msg] = await db
    .insert(schema.messages)
    .values({ companyId, conversationId: conv.id, direction: "in", body })
    .returning();
  await db
    .update(schema.conversations)
    .set({
      lastMessageAt: new Date(),
      unreadCount: (conv.unreadCount ?? 0) + 1,
      // Só sobrescreve quando o canal trouxe um alvo novo: uma conversa que
      // veio do YouTube e recebeu uma mensagem de outro canal não pode perder
      // a thread para onde a resposta precisa voltar.
      ...(externalRef ? { externalRef } : {}),
    })
    .where(eq(schema.conversations.id, conv.id));

  if (created) {
    emitToCompany(companyId, "conversation.created", { conversation: conv, contact });
    publishEvent(companyId, "conversation.created", { conversation: conv, contact }).catch(
      () => {}
    );
  }
  emitToCompany(companyId, "message.created", { conversationId: conv.id, message: msg });
  publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(
    () => {}
  );
  import("../modules/automations.js")
    .then((m) =>
      m.applyAutomations(companyId, { id: conv.id, contactId: contact.id }, body, created)
    )
    .catch(() => {});
}
