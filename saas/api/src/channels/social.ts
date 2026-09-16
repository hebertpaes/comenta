import { and, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import * as youtube from "./youtube.js";
import * as x from "./x.js";

/**
 * Coletor dos canais SEM webhook.
 *
 * WhatsApp mantém socket vivo e a Meta empurra evento por webhook — nesses dois
 * a mensagem chega sozinha. YouTube e X não oferecem push nos planos que uma
 * PME assina (o YouTube só notifica VÍDEO novo; o webhook de DM do X é
 * Enterprise), então aqui a mensagem só entra se a gente for buscar.
 *
 * Os intervalos são bem diferentes de propósito: a cota do YouTube é diária e
 * generosa para uma leitura a cada dois minutos, enquanto os planos baixos do X
 * contam requisição por MÊS — puxar de minuto em minuto queimaria a cota da
 * empresa em poucos dias.
 */

const YOUTUBE_POLL_MS = Number(process.env.YOUTUBE_POLL_MS ?? 120_000);
const X_POLL_MS = Number(process.env.X_POLL_MS ?? 300_000);

/** Conexões em coleta agora — a passada seguinte não entra por cima. */
const emCurso = new Set<string>();

type Canal = typeof schema.channels.$inferSelect;

async function conectados(tipo: string): Promise<Canal[]> {
  return db
    .select()
    .from(schema.channels)
    .where(and(eq(schema.channels.type, tipo), eq(schema.channels.status, "connected")));
}

/**
 * Roda uma passada num tipo de canal. Exportada para o teste poder disparar uma
 * passada sem depender do relógio.
 */
export async function passada(
  tipo: "youtube" | "x",
  log: (msg: string) => void = () => {}
): Promise<number> {
  const coletar = tipo === "youtube" ? youtube.coletar : x.coletar;
  let total = 0;

  for (const canal of await conectados(tipo)) {
    if (emCurso.has(canal.id)) continue;
    emCurso.add(canal.id);
    try {
      total += await coletar(canal);
    } catch (e) {
      const erro = e as Error & { rateLimited?: boolean };
      log(`coleta ${tipo} falhou em ${canal.id}: ${erro.message}`);

      // Credencial recusada não se resolve sozinha: marcar desconectado é o que
      // faz o admin ver vermelho no painel em vez de uma conexão "conectada"
      // que silenciosamente parou de trazer mensagem. Limite de cota (429) NÃO
      // entra aqui — ali é só esperar a janela virar.
      if (!erro.rateLimited && /refresh token|credenciais|\(401\)|\(403\)/i.test(erro.message)) {
        await db
          .update(schema.channels)
          .set({ status: "disconnected" })
          .where(eq(schema.channels.id, canal.id))
          .catch(() => {});
      }
    } finally {
      emCurso.delete(canal.id);
    }
  }
  return total;
}

/** Liga os dois relógios. Chamado uma vez no boot da API. */
export function startSocialPolling(log: (msg: string) => void = () => {}) {
  const agendar = (tipo: "youtube" | "x", intervalo: number) => {
    if (intervalo <= 0) return; // desligado por ambiente
    setInterval(() => {
      passada(tipo, log).catch(() => {});
    }, intervalo);
  };
  agendar("youtube", YOUTUBE_POLL_MS);
  agendar("x", X_POLL_MS);
}
