import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { authenticate } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import * as whatsapp from "../channels/whatsapp.js";

/**
 * Canais — conexão de WhatsApp Business via QR.
 *
 * Toda a lógica de sessão (QR real, pareamento, ingestão de mensagens e envio)
 * vive em ../channels/whatsapp.ts. Com a lib Baileys instalada a conexão é real;
 * sem ela (ou WHATSAPP_MODE=demo) o gerenciador cai num modo de demonstração
 * que gera um QR e simula o pareamento — o painel funciona nos dois casos.
 */

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
    const out = await whatsapp.connect(req.principal.companyId);
    audit(req.principal, "channel.whatsapp.connect", "channel", req.principal.companyId);
    return out;
  });

  // Estado atual da conexão (o painel faz polling aqui).
  app.get("/channels/whatsapp/status", async (req) => {
    return whatsapp.status(req.principal.companyId);
  });

  // Desconecta o WhatsApp.
  app.post("/channels/whatsapp/disconnect", async (req) => {
    const out = await whatsapp.disconnect(req.principal.companyId);
    audit(req.principal, "channel.whatsapp.disconnect", "channel", req.principal.companyId);
    return out;
  });
}
