import QRCode from "qrcode";
import fs from "node:fs";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { recordInbound } from "./inbound.js";

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
  saveTimer?: NodeJS.Timeout; // grava a agenda em lote (ver scheduleSaveContacts)
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
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
  fatal() {},
  child() {
    return silentLogger;
  },
};

function dataDir(): string {
  return process.env.WHATSAPP_DATA_DIR || "/data/wa";
}

/**
 * Puxa o histórico completo no pareamento — é junto dele que o WhatsApp manda a
 * agenda do aparelho.
 *
 * Fica DESLIGADO por padrão: ligado, o sync inicial é pesado e, num teste aqui,
 * derrubou uma sessão restaurada em loop de reconexão (código 408). Ligue
 * (WHATSAPP_FULL_SYNC=1) apenas quando for parear um número novo e você quiser
 * importar a agenda dele — e observe a estabilidade da conexão.
 */
const WHATSAPP_FULL_SYNC = process.env.WHATSAPP_FULL_SYNC === "1";

// Pasta de credenciais desta conexão. Migra a pasta legada (indexada por
// empresa, do tempo em que só havia 1 WhatsApp) para o novo esquema por
// conexão, preservando o número já pareado.
function authDir(channelId: string, companyId: string): string {
  const dir = `${dataDir()}/${channelId}`;
  try {
    const legacy = `${dataDir()}/${companyId}`;
    if (!fs.existsSync(dir) && fs.existsSync(legacy)) fs.renameSync(legacy, dir);
  } catch {
    /* best-effort */
  }
  return dir;
}

let waVersion: any;
async function fetchWaVersion(mod: any) {
  if (waVersion !== undefined) return waVersion;
  try {
    const r = await mod.fetchLatestBaileysVersion();
    waVersion = r?.version ?? null;
    console.log(
      `[wa] versão WhatsApp Web: ${Array.isArray(waVersion) ? waVersion.join(".") : "padrão"}`
    );
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

// ---- Agenda do aparelho ----------------------------------------------------
//
// O WhatsApp entrega a agenda por eventos (contacts.upsert/update e o sync de
// app-state), quase toda de uma vez logo após o pareamento. Guardar só em
// memória perdia tudo no primeiro restart da API: numa sessão restaurada o
// WhatsApp NÃO reenvia a lista, então o botão "sincronizar contatos" só
// funcionava na exata execução em que o número foi pareado. Por isso a agenda
// é gravada junto das credenciais e recarregada ao restaurar a sessão.

function contactsFile(session: Session): string {
  return `${authDir(session.channelId, session.companyId)}/contatos.json`;
}

/** Grava a agenda em disco. Agendado, não imediato: os eventos chegam em
 *  rajadas de centenas e um write por evento castigaria o disco à toa. */
function scheduleSaveContacts(session: Session) {
  if (session.saveTimer) return;
  session.saveTimer = setTimeout(() => {
    session.saveTimer = undefined;
    try {
      fs.writeFileSync(contactsFile(session), JSON.stringify([...session.contacts.entries()]));
    } catch {
      /* best-effort: perder o cache não quebra o atendimento */
    }
  }, 2000);
}

/** Recarrega a agenda gravada, para a sincronização sobreviver a restarts. */
function loadContacts(session: Session) {
  try {
    const raw = fs.readFileSync(contactsFile(session), "utf8");
    for (const [phone, name] of JSON.parse(raw) as [string, string][]) {
      session.contacts.set(phone, name);
    }
    if (session.contacts.size) {
      console.log(`[wa] agenda recuperada do disco: ${session.contacts.size} contatos`);
    }
  } catch {
    /* primeira conexão ainda não tem arquivo */
  }
}

// Acumula os contatos da agenda do aparelho conectado nesta sessão.
function ingestContacts(session: Session, list: any[] | undefined, origem = "?") {
  // Sem este log não há como distinguir "o WhatsApp não mandou a agenda" de
  // "mandou e o filtro descartou" — os dois terminam com a lista vazia.
  if (list?.length) {
    console.log(`[wa] evento de contatos (${origem}): ${list.length} entrada(s)`);
  }
  let mudou = false;
  for (const c of list || []) {
    const jid: string = c?.id || c?.jid || "";
    if (!jid.endsWith("@s.whatsapp.net")) continue; // ignora grupos/broadcast
    const phone = jidToPhone(jid);
    if (!phone) continue;
    const name = (c?.name || c?.verifiedName || c?.notify || "").trim();
    if (name || !session.contacts.has(phone)) {
      session.contacts.set(phone, name);
      mudou = true;
    }
  }
  if (mudou) scheduleSaveContacts(session);
}

/**
 * Pede ao WhatsApp que reenvie o app-state (que inclui a agenda) e espera os
 * eventos chegarem. É o que recupera a lista numa sessão já pareada, sem
 * precisar ler o QR de novo.
 */
async function resyncContacts(session: Session, timeoutMs = 15000): Promise<void> {
  const sock = session.sock;
  if (!sock?.resyncAppState) return;
  const antes = session.contacts.size;
  try {
    // Mesmos coletores que o Baileys usa no sync inicial.
    await sock.resyncAppState(
      ["critical_block", "critical_unblock_low", "regular_high", "regular_low", "regular"],
      true
    );
  } catch (e: any) {
    console.log(`[wa] resync da agenda falhou: ${e?.message ?? e}`);
    return;
  }
  // Os eventos chegam de forma assíncrona depois do resync; aguarda a agenda
  // parar de crescer em vez de devolver uma lista pela metade.
  const limite = Date.now() + timeoutMs;
  let ultimo = session.contacts.size;
  let estavel = 0;
  while (Date.now() < limite && estavel < 3) {
    await new Promise((r) => setTimeout(r, 700));
    if (session.contacts.size === ultimo) estavel++;
    else {
      estavel = 0;
      ultimo = session.contacts.size;
    }
  }
  console.log(`[wa] resync da agenda: ${antes} -> ${session.contacts.size} contatos`);
}

type Channel = { id: string; companyId: string };

async function loadChannel(channelId: string): Promise<Channel | null> {
  const [ch] = await db
    .select({
      id: schema.channels.id,
      companyId: schema.channels.companyId,
      type: schema.channels.type,
    })
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId));
  if (!ch || ch.type !== "whatsapp") return null;
  return { id: ch.id, companyId: ch.companyId };
}

async function setChannelStatus(
  channelId: string,
  status: string,
  config?: Record<string, unknown>
) {
  await db
    .update(schema.channels)
    .set({ status, ...(config ? { config } : {}) })
    .where(eq(schema.channels.id, channelId))
    .catch(() => {});
}

// ---- Ingestão de mensagens recebidas (WhatsApp → plataforma) ---------------
async function recordInboundByPhone(companyId: string, phone: string, name: string, body: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return;

  let [contact] = await db
    .select()
    .from(schema.contacts)
    .where(and(eq(schema.contacts.companyId, companyId), eq(schema.contacts.phone, digits)));
  if (!contact) {
    [contact] = await db
      .insert(schema.contacts)
      .values({
        companyId,
        name: name?.trim() || "Contato WhatsApp",
        phone: digits,
        tags: ["whatsapp"],
      })
      .returning();
  }

  // Daqui pra frente o fluxo é igual em todo canal (conversa, mensagem, eventos,
  // automações) e mora em ./inbound.ts. `channelId` fica null de propósito: o
  // envio no WhatsApp usa qualquer sessão conectada da empresa, não a conexão
  // exata que recebeu.
  await recordInbound(companyId, contact, body, null);
}

// ---- Conexão real (Baileys) -------------------------------------------------
async function connectBaileys(channel: Channel, mod: any) {
  const prev = sessions.get(channel.id);
  if (prev?.sock) {
    try {
      prev.sock.end?.();
    } catch {
      /* ignore */
    }
  }

  const { state, saveCreds } = await mod.useMultiFileAuthState(
    authDir(channel.id, channel.companyId)
  );
  const version = await fetchWaVersion(mod);
  const makeSock = mod.default || mod.makeWASocket;
  console.log(`[wa] iniciando sessão (canal ${channel.id})`);
  const sock = makeSock({
    auth: state,
    version,
    logger: silentLogger,
    browser: ["Comenta", "Chrome", "1.0.0"],
    // A agenda do aparelho vem junto do sync de histórico. Com `false` o
    // WhatsApp manda um sync mínimo e a lista de contatos não vem — era por
    // isso que "sincronizar contatos" não trazia nada. Ligado, o sync inicial
    // é mais pesado, mas acontece uma vez por pareamento.
    syncFullHistory: WHATSAPP_FULL_SYNC,
  });

  const session: Session = {
    channelId: channel.id,
    companyId: channel.companyId,
    status: "connecting",
    qr: null,
    phone: null,
    mode: "baileys",
    sock,
    contacts: new Map(),
  };
  sessions.set(channel.id, session);
  // Antes de qualquer evento: recupera a agenda gravada na execução anterior.
  loadContacts(session);

  sock.ev.on("creds.update", saveCreds);

  // Agenda do aparelho: captura a lista de contatos conforme o WhatsApp a envia.
  sock.ev.on("contacts.upsert", (list: any[]) => ingestContacts(session, list, "upsert"));
  sock.ev.on("contacts.update", (list: any[]) => ingestContacts(session, list, "update"));
  sock.ev.on("messaging-history.set", (h: any) => {
    console.log(
      `[wa] history.set: ${h?.contacts?.length ?? 0} contatos, ${h?.chats?.length ?? 0} conversas, isLatest=${h?.isLatest}`
    );
    ingestContacts(session, h?.contacts, "history");
  });

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
      console.log(
        `[wa] conexão fechada (canal ${channel.id}) code=${code ?? "?"} tentativa=${tries} ${msg}`
      );
      if (loggedOut || tries > 5) {
        reconnects.delete(channel.id);
        session.status = "disconnected";
        session.sock = null;
        sessions.delete(channel.id);
        await setChannelStatus(channel.id, "disconnected", {});
      } else if (sessions.get(channel.id) === session) {
        reconnects.set(channel.id, tries);
        connectBaileys(channel, mod).catch((e: any) =>
          console.log(`[wa] erro ao reconectar: ${e?.message ?? e}`)
        );
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
      await recordInboundByPhone(
        channel.companyId,
        jidToPhone(jid) || "",
        m.pushName || "Contato WhatsApp",
        text
      ).catch(() => {});
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
  const session: Session = {
    channelId: channel.id,
    companyId: channel.companyId,
    status: "connecting",
    qr,
    phone: null,
    mode: "demo",
    sock: null,
    contacts: new Map(),
  };

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
  if (s?.sock) {
    try {
      await s.sock.logout?.();
    } catch {
      try {
        s.sock.end?.();
      } catch {
        /* ignore */
      }
    }
  }
  sessions.delete(channelId);
  await setChannelStatus(channelId, "disconnected", {});
  return { status: "disconnected" as const };
}

/** Entrega uma mensagem outbound no WhatsApp do contato, usando QUALQUER sessão
 *  conectada da empresa. Retorna false se nenhuma estiver conectada ou o contato
 *  não tiver telefone. */
export async function sendToContact(
  companyId: string,
  contactId: string,
  body: string,
  media?: { url: string; type: "image" | "file"; fileName?: string }
): Promise<boolean> {
  let session: Session | null = null;
  for (const s of sessions.values()) {
    if (s.companyId === companyId && s.status === "connected" && s.mode === "baileys" && s.sock) {
      session = s;
      break;
    }
  }
  if (!session) return false;
  const [contact] = await db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.id, contactId));
  const digits = contact?.phone?.replace(/\D/g, "");
  if (!digits) return false;
  const jid = `${digits}@s.whatsapp.net`;
  if (media?.url) {
    // Baileys busca a mídia pela URL. Imagem entra com legenda; arquivo como documento.
    if (media.type === "image") {
      await session.sock.sendMessage(jid, {
        image: { url: media.url },
        caption: body || undefined,
      });
    } else {
      const fileName = media.fileName || media.url.split("/").pop()?.split("?")[0] || "arquivo";
      await session.sock.sendMessage(jid, {
        document: { url: media.url },
        fileName,
        caption: body || undefined,
      });
    }
    return true;
  }
  await session.sock.sendMessage(jid, { text: body });
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
export async function syncContacts(channelId: string): Promise<{
  ok: boolean;
  imported: number;
  renamed?: number;
  skipped: number;
  total: number;
  error?: string;
}> {
  const s = sessions.get(channelId);
  if (!s) return { ok: false, imported: 0, skipped: 0, total: 0, error: "conexão não está ativa" };
  if (s.status !== "connected")
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      total: 0,
      error: "conecte o WhatsApp antes de sincronizar",
    };

  // Agenda vazia numa sessão real significa, quase sempre, sessão restaurada:
  // o WhatsApp mandou a lista no pareamento e não a reenvia sozinho. Pedir o
  // app-state de novo recupera sem precisar reler o QR.
  if (s.mode === "baileys" && s.contacts.size === 0) {
    await resyncContacts(s);
  }

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
  let renamed = 0;
  let skipped = 0;
  for (const [phone, name] of entries) {
    const digits = phone.replace(/\D/g, "");
    if (!digits) continue;
    const daAgenda = name?.trim() ?? "";
    const res = await db
      .insert(schema.contacts)
      .values({
        companyId: s.companyId,
        name: daAgenda || `Contato ${digits}`,
        phone: digits,
        tags: ["whatsapp"],
      })
      .onConflictDoNothing()
      .returning();
    if (res.length) {
      imported++;
      continue;
    }

    // Já existia. Contato criado por mensagem recebida fica com nome genérico
    // ("Contato WhatsApp"); a agenda tem o nome de verdade e é isso que o
    // atendente quer ver na lista. Só sobrescrevemos o genérico — um nome
    // editado à mão na plataforma é escolha de alguém e permanece.
    if (daAgenda) {
      const [atual] = await db
        .select({ id: schema.contacts.id, name: schema.contacts.name })
        .from(schema.contacts)
        .where(and(eq(schema.contacts.companyId, s.companyId), eq(schema.contacts.phone, digits)));
      if (atual && ehNomeGenerico(atual.name, digits) && atual.name !== daAgenda) {
        await db
          .update(schema.contacts)
          .set({ name: daAgenda })
          .where(eq(schema.contacts.id, atual.id));
        renamed++;
        continue;
      }
    }
    skipped++;
  }
  // `imported` soma os renomeados para o painel continuar dizendo quantos
  // contatos a sincronização de fato melhorou; `renamed` detalha para quem lê a API.
  return { ok: true, imported: imported + renamed, renamed, skipped, total: entries.length };
}

/** Nome que a plataforma gerou sozinha (não veio de pessoa nem da agenda). */
export function ehNomeGenerico(nome: string, digits: string): boolean {
  return nome === "Contato WhatsApp" || nome === `Contato ${digits}`;
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
    if (wasConnected)
      await connectBaileys({ id: ch.id, companyId: ch.companyId }, mod).catch(() => {});
  }
}
