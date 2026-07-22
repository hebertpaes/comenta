import QRCode from "qrcode";
import { and, desc, eq, ne } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";

/**
 * Sessão de WhatsApp por empresa (Baileys).
 *
 * O painel pareia o número da empresa via QR. A partir daí:
 *   • mensagens que chegam no WhatsApp viram conversas na plataforma (inbound);
 *   • respostas do atendente são entregues no WhatsApp do cliente (outbound).
 *
 * O Baileys é carregado sob demanda (import dinâmico). Se a lib não estiver
 * instalada, ou se WHATSAPP_MODE=demo, caímos num MODO DEMONSTRAÇÃO que gera um
 * QR real e simula o pareamento — assim o painel funciona mesmo sem a lib, e o
 * boot da API nunca quebra por causa dela.
 */

type Session = {
  companyId: string;
  status: "connecting" | "connected" | "disconnected";
  qr: string | null; // data URL
  phone: string | null;
  mode: "baileys" | "demo";
  sock: any | null;
  timer?: NodeJS.Timeout;
};

const sessions = new Map<string, Session>();

// undefined = ainda não tentamos importar; null = indisponível; objeto = ok.
let baileys: any | undefined;
async function loadBaileys(): Promise<any | null> {
  if (baileys !== undefined) return baileys;
  if (process.env.WHATSAPP_MODE === "demo") return (baileys = null);
  try {
    // Specifier em variável: o tsc trata como `any` e não exige os tipos da lib
    // em build; em runtime o tsx resolve normalmente quando ela está instalada.
    const name = "@whiskeysockets/baileys";
    baileys = await import(name);
  } catch {
    baileys = null;
  }
  return baileys;
}

// Logger no-op compatível com a interface que o Baileys espera (evita depender
// do pino só para silenciar os logs internos da lib).
const silentLogger: any = {
  level: "silent",
  trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {},
  child() { return silentLogger; },
};

function dataDir(): string {
  return process.env.WHATSAPP_DATA_DIR || "/data/wa";
}

// Versão do protocolo do WhatsApp Web. Sem isso, o Baileys usa uma versão
// embutida que pode estar desatualizada — o WhatsApp então fecha a conexão
// antes de emitir o QR (fica "conectando" para sempre, sem QR).
let waVersion: any;
async function fetchWaVersion(mod: any) {
  if (waVersion !== undefined) return waVersion;
  try {
    const r = await mod.fetchLatestBaileysVersion();
    waVersion = r?.version ?? null;
    console.log(`[wa] versão WhatsApp Web: ${Array.isArray(waVersion) ? waVersion.join(".") : "padrão"}`);
  } catch (e: any) {
    waVersion = null;
    console.log(`[wa] não consegui buscar a versão (${e?.message ?? e}); usando a padrão`);
  }
  return waVersion || undefined;
}

// Contador de reconexões por empresa (evita loop infinito sem QR).
const reconnects = new Map<string, number>();
function jidToPhone(jid?: string | null): string | null {
  if (!jid) return null;
  const digits = jid.split("@")[0].split(":")[0].replace(/\D/g, "");
  return digits || null;
}

async function ensureWhatsappChannel(companyId: string) {
  const [existing] = await db
    .select()
    .from(schema.channels)
    .where(and(eq(schema.channels.companyId, companyId), eq(schema.channels.type, "whatsapp")));
  if (existing) return existing;
  const [created] = await db
    .insert(schema.channels)
    .values({ companyId, type: "whatsapp", name: "WhatsApp Business", status: "disconnected" })
    .returning();
  return created;
}
async function setChannelStatus(companyId: string, status: string, config?: Record<string, unknown>) {
  await db
    .update(schema.channels)
    .set({ status, ...(config ? { config } : {}) })
    .where(and(eq(schema.channels.companyId, companyId), eq(schema.channels.type, "whatsapp")))
    .catch(() => {});
}

// ---- Ingestão de mensagens recebidas (WhatsApp → plataforma) ---------------
async function recordInbound(companyId: string, phone: string, name: string, body: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return;

  let [contact] = await db
    .select()
    .from(schema.contacts)
    .where(and(eq(schema.contacts.companyId, companyId), eq(schema.contacts.phone, digits)));
  if (!contact) {
    [contact] = await db
      .insert(schema.contacts)
      .values({ companyId, name: name?.trim() || "Contato WhatsApp", phone: digits, tags: ["whatsapp"] })
      .returning();
  }

  // Reaproveita a conversa em aberto (pending/open) do contato; senão cria.
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
      .values({ companyId, contactId: contact.id, status: "pending", unreadCount: 0, lastMessageAt: new Date() })
      .returning();
    created = true;
  }

  const [msg] = await db
    .insert(schema.messages)
    .values({ companyId, conversationId: conv.id, direction: "in", body })
    .returning();
  await db
    .update(schema.conversations)
    .set({ lastMessageAt: new Date(), unreadCount: (conv.unreadCount ?? 0) + 1 })
    .where(eq(schema.conversations.id, conv.id));

  if (created) emitToCompany(companyId, "conversation.created", { conversation: conv, contact });
  emitToCompany(companyId, "message.created", { conversationId: conv.id, message: msg });
  publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(() => {});
}

// ---- Conexão real (Baileys) -------------------------------------------------
async function connectBaileys(companyId: string, mod: any) {
  // encerra socket anterior, se houver
  const prev = sessions.get(companyId);
  if (prev?.sock) { try { prev.sock.end?.(); } catch { /* ignore */ } }

  const { state, saveCreds } = await mod.useMultiFileAuthState(`${dataDir()}/${companyId}`);
  const version = await fetchWaVersion(mod);
  const makeSock = mod.default || mod.makeWASocket;
  console.log(`[wa] iniciando sessão (${companyId})`);
  const sock = makeSock({
    auth: state,
    version,
    logger: silentLogger,
    browser: ["Comenta", "Chrome", "1.0.0"],
    syncFullHistory: false,
  });

  const session: Session = { companyId, status: "connecting", qr: null, phone: null, mode: "baileys", sock };
  sessions.set(companyId, session);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u: any) => {
    if (u.qr) {
      console.log(`[wa] QR recebido (${companyId})`);
      session.qr = await QRCode.toDataURL(u.qr, { width: 320, margin: 1 }).catch(() => null);
      session.status = "connecting";
    }
    if (u.connection === "open") {
      console.log(`[wa] conectado (${companyId}) ${jidToPhone(sock.user?.id) ?? ""}`);
      reconnects.delete(companyId);
      session.status = "connected";
      session.qr = null;
      session.phone = jidToPhone(sock.user?.id);
      await setChannelStatus(companyId, "connected", { phone: session.phone, mode: "baileys" });
    }
    if (u.connection === "close") {
      const code = u.lastDisconnect?.error?.output?.statusCode;
      const msg = u.lastDisconnect?.error?.message ?? "";
      const loggedOut = code === mod.DisconnectReason?.loggedOut;
      const tries = (reconnects.get(companyId) ?? 0) + 1;
      console.log(`[wa] conexão fechada (${companyId}) code=${code ?? "?"} tentativa=${tries} ${msg}`);
      if (loggedOut || tries > 5) {
        // desistiu (deslogado ou muitas falhas): volta a "desconectado" no painel
        reconnects.delete(companyId);
        session.status = "disconnected";
        session.sock = null;
        sessions.delete(companyId);
        await setChannelStatus(companyId, "disconnected", {});
      } else if (sessions.get(companyId) === session) {
        // queda transitória: tenta reconectar com as credenciais salvas
        reconnects.set(companyId, tries);
        connectBaileys(companyId, mod).catch((e: any) => console.log(`[wa] erro ao reconectar: ${e?.message ?? e}`));
      }
    }
  });

  sock.ev.on("messages.upsert", async (up: any) => {
    if (up.type !== "notify") return;
    for (const m of up.messages || []) {
      if (!m?.message || m.key?.fromMe) continue;
      const jid: string = m.key?.remoteJid || "";
      if (!jid.endsWith("@s.whatsapp.net")) continue; // ignora grupos/status/broadcast
      const text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        "";
      if (!text.trim()) continue;
      await recordInbound(companyId, jidToPhone(jid) || "", m.pushName || "Contato WhatsApp", text).catch(() => {});
    }
  });

  await ensureWhatsappChannel(companyId);
  await setChannelStatus(companyId, "connecting");
  return { status: session.status, qr: session.qr, demo: false };
}

// ---- Modo demonstração (sem lib / WHATSAPP_MODE=demo) -----------------------
async function connectDemo(companyId: string) {
  const prev = sessions.get(companyId);
  if (prev?.timer) clearTimeout(prev.timer);

  const pairingToken = `comenta-wa:${companyId}:${Date.now()}`;
  const qr = await QRCode.toDataURL(pairingToken, { width: 320, margin: 1 });
  const session: Session = { companyId, status: "connecting", qr, phone: null, mode: "demo", sock: null };

  session.timer = setTimeout(async () => {
    const s = sessions.get(companyId);
    if (!s || s.status !== "connecting") return;
    s.status = "connected";
    s.qr = null;
    s.phone = "5566999999999"; // demo — no modo real é o número pareado
    await setChannelStatus(companyId, "connected", { phone: s.phone, mode: "demo" });
  }, 12000);

  sessions.set(companyId, session);
  await ensureWhatsappChannel(companyId);
  await setChannelStatus(companyId, "connecting");
  return { status: session.status, qr: session.qr, demo: true };
}

// ---- API pública do gerenciador --------------------------------------------
export async function connect(companyId: string) {
  const mod = await loadBaileys();
  return mod ? connectBaileys(companyId, mod) : connectDemo(companyId);
}

export function status(companyId: string) {
  const s = sessions.get(companyId);
  if (!s) return { status: "disconnected" as const, qr: null, phone: null, demo: baileys == null };
  return { status: s.status, qr: s.qr, phone: s.phone, demo: s.mode === "demo" };
}

export async function disconnect(companyId: string) {
  const s = sessions.get(companyId);
  if (s?.timer) clearTimeout(s.timer);
  if (s?.sock) { try { await s.sock.logout?.(); } catch { try { s.sock.end?.(); } catch { /* ignore */ } } }
  sessions.delete(companyId);
  await setChannelStatus(companyId, "disconnected", {});
  return { status: "disconnected" as const };
}

/** Entrega uma mensagem outbound no WhatsApp do contato. Retorna false se o
 *  canal não estiver conectado ou o contato não tiver telefone. */
export async function sendToContact(companyId: string, contactId: string, body: string): Promise<boolean> {
  const s = sessions.get(companyId);
  if (!s || s.status !== "connected") return false;
  const [contact] = await db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId));
  const digits = contact?.phone?.replace(/\D/g, "");
  if (!digits) return false;
  if (s.mode === "demo" || !s.sock) return false; // demo não entrega de verdade
  await s.sock.sendMessage(`${digits}@s.whatsapp.net`, { text: body });
  return true;
}

/** Restaura sessões previamente conectadas (credenciais em disco) no boot. */
export async function restoreSessions() {
  const mod = await loadBaileys();
  if (!mod) return;
  const rows = await db
    .select()
    .from(schema.channels)
    .where(eq(schema.channels.type, "whatsapp"))
    .catch(() => [] as any[]);
  for (const ch of rows) {
    const wasConnected = ch.status === "connected" || (ch.config as any)?.mode === "baileys";
    if (wasConnected) await connectBaileys(ch.companyId, mod).catch(() => {});
  }
}
