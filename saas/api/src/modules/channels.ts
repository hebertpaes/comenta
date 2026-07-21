import type { FastifyInstance } from "fastify";
import { and, eq, desc } from "drizzle-orm";
import QRCode from "qrcode";
import { db, schema } from "../db/client.js";
import { authenticate } from "../lib/http.js";
import { audit } from "../lib/audit.js";

/**
 * Canais — conexão de WhatsApp Business via QR.
 *
 * MODO DEMONSTRAÇÃO: gera um QR real (escaneável) e simula o pareamento,
 * marcando a sessão como "conectada" após alguns segundos, para permitir
 * testar todo o fluxo do painel localmente. A integração real com o WhatsApp
 * (biblioteca Baileys mantendo o socket e emitindo o QR de verdade) entra no
 * ponto marcado com "TODO(baileys)" — a interface do painel e os endpoints
 * abaixo já ficam prontos para ela.
 */

type WaSession = {
  status: "connecting" | "connected" | "disconnected";
  qr: string | null; // data URL
  phone: string | null;
  timer?: NodeJS.Timeout;
};

// Sessão por empresa (suficiente para deploy single-instance / local).
const sessions = new Map<string, WaSession>();

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
    .where(and(eq(schema.channels.companyId, companyId), eq(schema.channels.type, "whatsapp")));
}

export async function channelRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Lista os canais da empresa.
  app.get("/channels", async (req) => {
    const rows = await db
      .select()
      .from(schema.channels)
      .where(eq(schema.channels.companyId, req.principal.companyId))
      .orderBy(desc(schema.channels.createdAt));
    return { data: rows };
  });

  // Inicia (ou reinicia) a conexão do WhatsApp e devolve o QR para escanear.
  app.post("/channels/whatsapp/connect", async (req) => {
    const companyId = req.principal.companyId;
    await ensureWhatsappChannel(companyId);

    // limpa sessão anterior
    const prev = sessions.get(companyId);
    if (prev?.timer) clearTimeout(prev.timer);

    // QR real (escaneável). No modo real, este payload vem do Baileys.
    const pairingToken = `comenta-wa:${companyId}:${Date.now()}`;
    const qr = await QRCode.toDataURL(pairingToken, { width: 320, margin: 1 });

    const session: WaSession = { status: "connecting", qr, phone: null };

    // TODO(baileys): substituir o timer abaixo pela sessão real do Baileys,
    // que emite eventos "qr" e "open" (conectado) com o número pareado.
    session.timer = setTimeout(async () => {
      const s = sessions.get(companyId);
      if (!s || s.status !== "connecting") return;
      s.status = "connected";
      s.qr = null;
      s.phone = "+55 66 99999-9999"; // demo — no real seria o número pareado
      await setChannelStatus(companyId, "connected", { phone: s.phone, mode: "demo" }).catch(() => {});
    }, 12000);

    sessions.set(companyId, session);
    await setChannelStatus(companyId, "connecting");
    audit(req.principal, "channel.whatsapp.connect", "channel", companyId);
    return { status: session.status, qr: session.qr, demo: true };
  });

  // Estado atual da conexão (o painel faz polling aqui).
  app.get("/channels/whatsapp/status", async (req) => {
    const s = sessions.get(req.principal.companyId);
    if (!s) return { status: "disconnected", qr: null, phone: null };
    return { status: s.status, qr: s.qr, phone: s.phone, demo: true };
  });

  // Desconecta o WhatsApp.
  app.post("/channels/whatsapp/disconnect", async (req) => {
    const companyId = req.principal.companyId;
    const s = sessions.get(companyId);
    if (s?.timer) clearTimeout(s.timer);
    sessions.delete(companyId);
    await setChannelStatus(companyId, "disconnected", {});
    audit(req.principal, "channel.whatsapp.disconnect", "channel", companyId);
    return { status: "disconnected" };
  });
}
