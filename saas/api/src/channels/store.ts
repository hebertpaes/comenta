import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";

/**
 * Mescla campos no `config` de uma conexão, preservando o resto.
 *
 * Dois canais precisam ESCREVER no próprio config enquanto rodam:
 *   • YouTube e X guardam o cursor de leitura (até onde já importamos), sem o
 *     qual cada passada do coletor reimportaria os mesmos comentários;
 *   • o X rotaciona o refresh token a cada renovação — guardar o novo é o que
 *     impede a conexão de morrer na renovação seguinte.
 *
 * Ler-modificar-gravar em vez de um `jsonb_set` porque o coletor é o único
 * escritor destes campos e roda serializado por conexão (ver social.ts).
 */
export async function mergeChannelConfig(channelId: string, patch: Record<string, unknown>) {
  const [row] = await db.select().from(schema.channels).where(eq(schema.channels.id, channelId));
  if (!row) return null;
  const merged = { ...(row.config as Record<string, unknown>), ...patch };
  await db.update(schema.channels).set({ config: merged }).where(eq(schema.channels.id, channelId));
  return merged;
}
