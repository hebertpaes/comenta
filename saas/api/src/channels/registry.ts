import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";

/**
 * Registro de adaptadores de canal. Cada tipo de canal (whatsapp, simulator…)
 * implementa a entrega de mensagens outbound do seu jeito; a API não conhece
 * detalhes do provedor.
 */
export type ChannelDriver = {
  type: string;
  /** Entrega uma mensagem outbound ao contato. Lança erro se falhar. */
  send(channelConfig: Record<string, unknown>, to: { phone: string | null }, body: string): Promise<void>;
};

const drivers = new Map<string, ChannelDriver>();

export function registerDriver(driver: ChannelDriver) {
  drivers.set(driver.type, driver);
}

// Canal simulador: usado em desenvolvimento e demos — apenas registra a entrega.
registerDriver({
  type: "simulator",
  async send() {
    /* entrega simulada: nada a fazer */
  },
});

// Canal WhatsApp: a entrega real é feita pelo gerenciador de sessão
// (../channels/whatsapp.ts → sendToContact), chamado direto no envio da
// mensagem. Aqui o driver é no-op para não duplicar o envio nem lançar erro
// quando a conversa está vinculada a um canal WhatsApp.
registerDriver({
  type: "whatsapp",
  async send() {
    /* entrega tratada pelo gerenciador de sessão do WhatsApp */
  },
});

export async function deliverOutbound(channelId: string | null, contactId: string, body: string) {
  if (!channelId) return;
  const [channel] = await db.select().from(schema.channels).where(eq(schema.channels.id, channelId));
  if (!channel) return;
  const driver = drivers.get(channel.type);
  if (!driver) return;
  const [contact] = await db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId));
  await driver.send(channel.config, { phone: contact?.phone ?? null }, body);
}
