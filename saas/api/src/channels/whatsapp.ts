import QRCode from "qrcode";
import fs from "node:fs";
import { and, desc, eq, ne } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { emitToCompany } from "../realtime.js";
import { publishEvent } from "../queues.js";

/**
 * Sessões de WhatsApp (Baileys) — MULTI-CONEXÃO.
 *
 * Cada conexão é uma linha em `channels` (type=whatsapp). Uma empresa pode ter
 * VÁRIOS números conectados ao mesmo tempo; cada sessão é indexada pelo id da
 * conexão (channelId), não mais pela empresa.
 *
 * O painel pareia cada número via QR. A partir daí:
 *   • mensagens que chegam no WhatsApp viram conversas na plataforma (inbound);
 *   • respostas do atendente são entregues no WhatsApp do cliente (outbound).
 *
 * O Baileys é carregado sob demanda (import dinâmico). Se a lib não estiver
 * instalada, ou se WHATSAPP_MODE=demo, caímos num MODO DEMONSTRAÇÃO que gera um
 * QR real e simula o pareamento — assim o painel funciona mesmo sem a lib.
 */

type Session = {
  channelId: string;
  companyId: string;
  status: "connecting" | "connected" | "disconnected";
  qr: string | null; // data URL
  phone: string | null;
  mode: "baileys" | "demo";
  sock: any | null;
  contacts: Map<string, string>; // phone (dígitos) -> nome da agenda do aparelho
  timer?: NodeJS.Timeout;
};

const sessions = new Map<string, Session>(); // channelId -> Session
const reconnects = new Map<string, number>(); // channelId -> tentativas

// undefined = ainda não tentamos importar; null = indisponível; objeto = ok.
let baileys: any | undefined;
async function loadBaileys(): Promise<any | null> {
  if (baileys !== undefined) return baileys;
  if (process.env.WHATSAPP_MODE === "demo") return (baileys = null);
  try {
    const name = "@whiskeysockets/baileys";
    baileys = await import(name);
  } catch {
    baileys = null;
  }
  return baileys;
}

const silentLogger: any = {
  level: "silent",
  trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {},
  child() { return silentLogger; },
};

function dataDir(): string {
  return process.env.WHATSAPP_DATA_DIR || "/data/wa";
}

// Pasta de credenciais desta conexão. Migra a pasta legada (indexada por
// empresa, do tempo em que só havia 1 WhatsApp) para o novo esquema por
// conexão, preservando o número já pareado.
function authDir(channelId: string, companyId: string): string {
  const dir = `${dataDir()}/${channelId}`;
  try {
    const legacy = `${dataDir()}/${companyId}`;
    if (!fs.existsSync(dir) && fs.existsSync(legacy)) fs.renameSync(legacy, dir);
  } catch { /* best-effort */ }
  return dir;
}

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

function jidToPhone(jid?: string | null): string | null {
  if (!jid) return null;
  const digits = jid.split("@")[0].split(":")[0].replace(/\D/g, "");
  return digits || null;
}

// Acumula os contatos da agenda do aparelho conectado nesta sessão. O WhatsApp
// entrega a lista por eventos (contacts.upsert/update e o sync inicial de
// histórico); guardamos o melhor nome disponível para cada número.
function ingestContacts(session: Session, list: any[] | undefined) {
  for (const c of list || []) {
    const jid: string = c?.id || c?.jid || "";
    if (!jid.endsWith("@s.whatsapp.net")) continue; // ignora grupos/broadcast
    const phone = jidToPhone(jid);
    if (!phone) continue;
    const name = (c?.name || c?.verifiedName || c?.notify || "").trim();
    if (name || !session.contacts.has(phone)) session.contacts.set(phone, name);
  }
}

type Channel = { id: string; companyId: string };

async function loadChannel(channelId: string): Promise<Channel | null> {
  const [ch] = await db
    .select({ id: schema.channels.id, companyId: schema.channels.companyId, type: schema.channels.type })
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId));
  if (!ch || ch.type !== "whatsapp") return null;
  return { id: ch.id, companyId: ch.companyId };
}

async function setChannelStatus(channelId: string, status: string, config?: Record<string, unknown>) {
  await db
    .update(schema.channels)
    .set({ status, ...(config ? { config } : {}) })
    .where(eq(schema.channels.id, channelId))
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

  if (created) {
    emitToCompany(companyId, "conversation.created", { conversation: conv, contact });
    publishEvent(companyId, "conversation.created", { conversation: conv, contact }).catch(() => {});
  }
  emitToCompany(companyId, "message.created", { conversationId: conv.id, message: msg });
  publishEvent(companyId, "message.created", { conversationId: conv.id, message: msg }).catch(() => {});
  import("../modules/automations.js")
    .then((m) => m.applyAutomations(companyId, { id: conv.id, contactId: contact.id }, body, created))
    .catch(() => {});
}

// ---- Conexão real (Baileys) -------------------------------------------------
async function connectBaileys(channel: Channel, mod: any) {
  const prev = sessions.get(channel.id);
  if (prev?.sock) { try { prev.sock.end?.(); } catch { /* ignore */ } }

  const { state, saveCreds } = await mod.useMultiFileAuthState(authDir(channel.id, channel.companyId));
  const version = await fetchWaVersion(mod);
  const makeSock = mod.default || mod.makeWASocket;
  console.log(`[wa] iniciando sessão (canal ${channel.id})`);
  const sock = makeSock({
    auth: state,
    version,
    logger: silentLogger,
    browser: ["Comenta", "Chrome", "1.0.0"],
    syncFullHistory: false,
  });

  const session: Session = { channelId: channel.id, companyId: channel.companyId, status: "connecting", qr: null, phone: null, mode: "baileys", sock, contacts: new Map() };
  sessions.set(channel.id, session);

  sock.ev.on("creds.update", saveCreds);

  // Agenda do aparelho: captura a lista de contatos conforme o WhatsApp a envia.
  sock.ev.on("contacts.upsert", (list: any[]) => ingestContacts(session, list));
  sock.ev.on("contacts.update", (list: any[]) => ingestContacts(session, list));
  sock.ev.on("messaging-history.set", (h: any) => ingestContacts(session, h?.contacts));

  sock.ev.on("connection.update", async (u: any) => {
    if (u.qr) {
      console.log(`[wa] QR recebido (canal ${channel.id})`);
      session.qr = await QRCode.toDataURL(u.qr, { width: 320, margin: 1 }).catch(() => null);
      session.status = "connecting";
    }
    if (u.connection === "open") {
      console.log(`[wa] conectado (canal ${channel.id}) ${jidToPhone(sock.user?.id) ?? ""}`);
      reconnects.delete(channel.id);
      session.status = "connected";
      session.qr = null;
      session.phone = jidToPhone(sock.user?.id);
      await setChannelStatus(channel.id, "connected", { phone: session.phone, mode: "baileys" });
    }
    if (u.connection === "close") {
      const code = u.lastDisconnect?.error?.output?.statusCode;
      const msg = u.lastDisconnect?.error?.message ?? "";
      const loggedOut = code === mod.DisconnectReason?.loggedOut;
      const tries = (reconnects.get(channel.id) ?? 0) + 1;
      console.log(`[wa] conexão fechada (canal ${channel.id}) code=${code ?? "?"} tentativa=${tries} ${msg}`);
      if (loggedOut || tries > 5) {
        reconnects.delete(channel.id);
        session.status = "disconnected";
        session.sock = null;
        sessions.delete(channel.id);
        await setChannelStatus(channel.id, "disconnected", {});
      } else if (sessions.get(channel.id) === session) {
        reconnects.set(channel.id, tries);
        connectBaileys(channel, mod).catch((e: any) => console.log(`[wa] erro ao reconectar: ${e?.message ?? e}`));
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
      await recordInbound(channel.companyId, jidToPhone(jid) || "", m.pushName || "Contato WhatsApp", text).catch(() => {});
    }
  });

  await setChannelStatus(channel.id, "connecting");
  return { status: session.status, qr: session.qr, demo: false };
}

// ---- Modo demonstração (sem lib / WHATSAPP_MODE=demo) -----------------------
async function connectDemo(channel: Channel) {
  const prev = sessions.get(channel.id);
  if (prev?.timer) clearTimeout(prev.timer);

  const pairingToken = `comenta-wa:${channel.id}:${Date.now()}`;
  const qr = await QRCode.toDataURL(pairingToken, { width: 320, margin: 1 });
  const session: Session = { channelId: channel.id, companyId: channel.companyId, status: "connecting", qr, phone: null, mode: "demo", sock: null, contacts: new Map() };

  session.timer = setTimeout(async () => {
    const s = sessions.get(channel.id);
    if (!s || s.status !== "connecting") return;
    s.status = "connected";
    s.qr = null;
    s.phone = "5566999999999"; // demo — no modo real é o número pareado
    await setChannelStatus(channel.id, "connected", { phone: s.phone, mode: "demo" });
  }, 12000);

  sessions.set(channel.id, session);
  await setChannelStatus(channel.id, "connecting");
  return { status: session.status, qr: session.qr, demo: true };
}

// ---- API pública do gerenciador --------------------------------------------
export async function connect(channelId: string) {
  const channel = await loadChannel(channelId);
  if (!channel) return { status: "disconnected" as const, qr: null, error: "canal inválido" };
  const mod = await loadBaileys();
  return mod ? connectBaileys(channel, mod) : connectDemo(channel);
}

export function status(channelId: string) {
  const s = sessions.get(channelId);
  if (!s) return { status: "disconnected" as const, qr: null, phone: null, demo: baileys == null };
  return { status: s.status, qr: s.qr, phone: s.phone, demo: s.mode === "demo" };
}

export async function disconnect(channelId: string) {
  const s = sessions.get(channelId);
  if (s?.timer) clearTimeout(s.timer);
  if (s?.sock) { try { await s.sock.logout?.(); } catch { try { s.sock.end?.(); } catch { /* ignore */ } } }
  sessions.delete(channelId);
  await setChannelStatus(channelId, "disconnected", {});
  return { status: "disconnected" as const };
}

/** Entrega uma mensagem outbound no WhatsApp do contato, usando QUALQUER sessão
 *  conectada da empresa. Retorna false se nenhuma estiver conectada ou o contato
 *  não tiver telefone. */
export async function sendToContact(companyId: string, contactId: string, body: string): Promise<boolean> {
  let session: Session | null = null;
  for (const s of sessions.values()) {
    if (s.companyId === companyId && s.status === "connected" && s.mode === "baileys" && s.sock) { session = s; break; }
  }
  if (!session) return false;
  const [contact] = await db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId));
  const digits = contact?.phone?.replace(/\D/g, "");
  if (!digits) return false;
  await session.sock.sendMessage(`${digits}@s.whatsapp.net`, { text: body });
  return true;
}

/** Quantos contatos a sessão já capturou da agenda do aparelho (para o painel
 *  mostrar antes de sincronizar). */
export function contactsCount(channelId: string): number {
  return sessions.get(channelId)?.contacts.size ?? 0;
}

/** Sincroniza a agenda do aparelho conectado para os Contatos da empresa.
 *  Insere quem ainda não existe (por telefone) com a tag "whatsapp"; nunca
 *  sobrescreve contatos já cadastrados. */
export async function syncContacts(channelId: string): Promise<{ ok: boolean; imported: number; skipped: number; total: number; error?: string }> {
  const s = sessions.get(channelId);
  if (!s) return { ok: false, imported: 0, skipped: 0, total: 0, error: "conexão não está ativa" };
  if (s.status !== "connected") return { ok: false, imported: 0, skipped: 0, total: 0, error: "conecte o WhatsApp antes de sincronizar" };

  let entries = [...s.contacts.entries()];
  // No modo demonstração (sem lib), gera uma agenda de exemplo para o fluxo ficar visível.
  if (s.mode === "demo" && entries.length === 0) {
    entries = [
      ["5566990000101", "João da Agenda"],
      ["5566990000102", "Maria Contato"],
      ["5566990000103", "Pedro Cliente"],
      ["5566990000104", "Ana Fornecedora"],
      ["5566990000105", "Carlos Parceiro"],
    ];
  }

  let imported = 0;
  let skipped = 0;
  for (const [phone, name] of entries) {
    const digits = phone.replace(/\D/g, "");
    if (!digits) continue;
    const res = await db
      .insert(schema.contacts)
      .values({ companyId: s.companyId, name: name?.trim() || `Contato ${digits}`, phone: digits, tags: ["whatsapp"] })
      .onConflictDoNothing()
      .returning();
    if (res.length) imported++;
    else skipped++;
  }
  return { ok: true, imported, skipped, total: entries.length };
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
    if (wasConnected) await connectBaileys({ id: ch.id, companyId: ch.companyId }, mod).catch(() => {});
  }
}
