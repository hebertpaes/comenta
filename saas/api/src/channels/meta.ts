import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { config } from "../config.js";
import { recordInbound } from "./inbound.js";

/**
 * Instagram Direct e Facebook Messenger — os dois canais da Meta.
 *
 * Eles compartilham TUDO: mesma Graph API, mesmo formato de webhook, mesmo
 * token de página. O que muda é o campo `object` do webhook ("instagram" vs
 * "page") e qual id identifica a conta. Por isso um adaptador só.
 *
 * LIMITE DA PLATAFORMA (não é decisão nossa): a Meta só permite responder
 * dentro de 24h contadas a partir da ÚLTIMA mensagem do usuário. Fora dessa
 * janela a Graph API recusa o envio. Não existe disparo em massa para quem
 * nunca escreveu para a página — a conversa é sempre iniciada pelo usuário.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Credenciais de uma conexão Meta, como salvas em `channels.config`.
 *
 * Só o que é DA PÁGINA fica aqui. O que é do app (segredo e token de
 * verificação) vem do ambiente da API — no protótipo há um app da Meta só,
 * usado por todas as conexões. `appSecret`/`verifyToken` continuam aceitos por
 * conexão para quando uma empresa trouxer o app dela.
 */
export const MetaConfig = z.object({
  // `required_error` além do `.min(1)`: o primeiro cobre o campo AUSENTE, o
  // segundo o campo vazio. Sem ele o admin veria "Required" em inglês — a
  // mensagem sai direto na resposta de erro de POST /channels/:id/connect.
  /** ID da página do Facebook. Dono do token e destinatário dos envios. */
  pageId: z
    .string({ required_error: "Informe o ID da página do Facebook" })
    .min(1, "Informe o ID da página do Facebook"),
  /** ID da conta comercial do Instagram. Só no canal instagram. */
  igAccountId: z.string().min(1).optional(),
  /** Token de acesso da PÁGINA (longa duração), não o token do usuário. */
  pageAccessToken: z
    .string({ required_error: "Informe o token de acesso da página" })
    .min(1, "Informe o token de acesso da página"),
  /** Sobrescreve META_APP_SECRET quando a empresa tem app próprio. */
  appSecret: z.string().min(1).optional(),
  /** Sobrescreve META_VERIFY_TOKEN quando a empresa tem app próprio. */
  verifyToken: z.string().min(1).optional(),
});
export type MetaConfig = z.infer<typeof MetaConfig>;

/** Segredo do app válido para esta conexão: o dela, ou o do protótipo. */
export const appSecretDe = (cfg: Partial<MetaConfig>) => cfg.appSecret || config.META_APP_SECRET;

/** Token de verificação válido para esta conexão: o dela, ou o do protótipo. */
export const verifyTokenDe = (cfg: Partial<MetaConfig>) =>
  cfg.verifyToken || config.META_VERIFY_TOKEN;

export const META_TYPES = ["instagram", "facebook"] as const;
export type MetaType = (typeof META_TYPES)[number];

export function isMetaType(type: string): type is MetaType {
  return (META_TYPES as readonly string[]).includes(type);
}

// ---- Assinatura -------------------------------------------------------------

/**
 * Confere o `X-Hub-Signature-256` sobre o corpo CRU. Precisa ser o corpo cru:
 * reserializar o JSON muda espaços e ordem de chaves, e o HMAC não fecha.
 *
 * Comparação em tempo constante — uma comparação comum vaza, pelo tempo de
 * resposta, quantos bytes do prefixo o atacante acertou.
 */
export function checkSignature(rawBody: string, header: string | undefined, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  let recebido: Buffer;
  try {
    recebido = Buffer.from(header.slice(7), "hex");
  } catch {
    return false;
  }
  if (recebido.length !== esperado.length) return false;
  return timingSafeEqual(recebido, esperado);
}

// ---- Handshake de verificação ----------------------------------------------

/**
 * Responde ao GET que a Meta dispara ao assinar o webhook. A URL é única para
 * todas as empresas, então o `verifyToken` é o que diz de qual conexão o
 * handshake é — por isso ele precisa ser distinto por conexão.
 */
export async function verifyChallenge(query: Record<string, unknown>) {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];
  if (mode !== "subscribe" || typeof token !== "string" || typeof challenge !== "string") {
    return null;
  }
  // Com o app único do protótipo, basta o token bater com META_VERIFY_TOKEN.
  // Ainda assim varremos as conexões, porque uma delas pode ter app próprio.
  if (config.META_VERIFY_TOKEN && token === config.META_VERIFY_TOKEN) return challenge;

  const canais = await db.select().from(schema.channels);
  const bate = canais.some(
    (c) => isMetaType(c.type) && (c.config as Record<string, unknown>)?.verifyToken === token
  );
  return bate ? challenge : null;
}

// ---- Entrada ----------------------------------------------------------------

/** Um evento de mensagem do webhook, no formato que a Meta entrega. */
const Evento = z.object({
  object: z.string(),
  entry: z
    .array(
      z.object({
        id: z.string(),
        messaging: z
          .array(
            z.object({
              sender: z.object({ id: z.string() }),
              recipient: z.object({ id: z.string() }).optional(),
              message: z
                .object({
                  mid: z.string().optional(),
                  text: z.string().optional(),
                  is_echo: z.boolean().optional(),
                })
                .optional(),
            })
          )
          .optional(),
      })
    )
    .default([]),
});

/** Acha a conexão dona de um `entry.id` (id da página ou da conta do IG). */
async function acharCanal(objeto: string, entryId: string) {
  const tipo: MetaType = objeto === "instagram" ? "instagram" : "facebook";
  const canais = await db
    .select()
    .from(schema.channels)
    .where(eq(schema.channels.type, tipo));
  return canais.find((c) => {
    const cfg = (c.config as Record<string, unknown>) || {};
    return cfg.pageId === entryId || cfg.igAccountId === entryId;
  });
}

/**
 * Resolve (ou cria) o contato de um usuário da Meta. Identificamos por
 * `externalId` — o PSID/IGSID — porque a Meta NÃO entrega telefone nem e-mail:
 * o mesmo usuário é um id opaco, diferente por página.
 */
async function resolverContato(companyId: string, externalId: string, tipo: MetaType, nome: string) {
  const [existente] = await db
    .select()
    .from(schema.contacts)
    .where(
      and(eq(schema.contacts.companyId, companyId), eq(schema.contacts.externalId, externalId))
    );
  if (existente) return existente;

  const [novo] = await db
    .insert(schema.contacts)
    .values({
      companyId,
      name: nome,
      externalId,
      tags: [tipo],
    })
    .returning();
  return novo;
}

/** Busca o nome do usuário na Graph API. Best-effort: falhou, usa o genérico. */
async function buscarNome(psid: string, token: string, tipo: MetaType): Promise<string> {
  const generico = tipo === "instagram" ? "Contato Instagram" : "Contato Messenger";
  try {
    const res = await fetch(`${GRAPH}/${psid}?fields=name&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return generico;
    const data = (await res.json()) as { name?: string };
    return data.name?.trim() || generico;
  } catch {
    return generico;
  }
}

/**
 * Processa o corpo de um webhook já validado. Devolve quantas mensagens foram
 * registradas — útil para log e para os testes.
 */
export async function handleWebhook(body: unknown): Promise<number> {
  const parsed = Evento.safeParse(body);
  if (!parsed.success) return 0;

  let registradas = 0;
  for (const entry of parsed.data.entry) {
    const canal = await acharCanal(parsed.data.object, entry.id);
    if (!canal) continue;
    const cfg = canal.config as MetaConfig;
    const tipo = canal.type as MetaType;

    for (const evento of entry.messaging ?? []) {
      // `is_echo` é a nossa própria resposta voltando pelo webhook. Registrar
      // criaria uma mensagem de entrada duplicada a cada resposta enviada.
      if (evento.message?.is_echo) continue;
      const texto = evento.message?.text?.trim();
      if (!texto) continue; // anexos/reações ainda não são tratados

      const nome = await buscarNome(evento.sender.id, cfg.pageAccessToken, tipo);
      const contato = await resolverContato(canal.companyId, evento.sender.id, tipo, nome);
      await recordInbound(canal.companyId, contato, texto, canal.id);
      registradas++;
    }
  }
  return registradas;
}

/** Valida a assinatura e processa. Separado para o teste cobrir cada metade. */
export async function receber(rawBody: string, assinatura: string | undefined, body: unknown) {
  const parsed = Evento.safeParse(body);
  if (!parsed.success) return { ok: false as const, motivo: "corpo inesperado" };

  // A assinatura é conferida com o segredo da conexão apontada pelo entry —
  // cada empresa tem o seu app, então não há um segredo global.
  for (const entry of parsed.data.entry) {
    const canal = await acharCanal(parsed.data.object, entry.id);
    if (!canal) continue;
    const segredo = appSecretDe(canal.config as MetaConfig);
    // Sem segredo configurado não dá para provar a origem — recusar é o certo:
    // aceitar seria deixar qualquer um injetar mensagens na conta de alguém.
    if (!segredo || !checkSignature(rawBody, assinatura, segredo)) {
      return { ok: false as const, motivo: "assinatura inválida" };
    }
  }

  const n = await handleWebhook(body);
  return { ok: true as const, registradas: n };
}

// ---- Saída ------------------------------------------------------------------

/**
 * Entrega uma resposta pelo Instagram/Messenger.
 *
 * `messaging_type: "RESPONSE"` declara que é resposta a uma mensagem do
 * usuário — o único tipo que a Meta aceita sem template dentro da janela de
 * 24h. Fora dela a Graph API devolve erro 10 ("outside allowed window"), e é
 * isso que o atendente vê como falha de envio.
 */
export async function enviar(config: MetaConfig, psid: string, body: string) {
  const url = `${GRAPH}/${config.pageId}/messages?access_token=${encodeURIComponent(config.pageAccessToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: body },
      messaging_type: "RESPONSE",
    }),
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Meta recusou o envio (${res.status}): ${detalhe.slice(0, 200)}`);
  }
}

/**
 * Confere se o token da página funciona, chamando a Graph API. É o que permite
 * marcar a conexão como "connected" de verdade em vez de só "configured".
 */
export async function testarCredenciais(config: MetaConfig) {
  let res: Response;
  try {
    res = await fetch(
      `${GRAPH}/${config.pageId}?fields=name&access_token=${encodeURIComponent(config.pageAccessToken)}`
    );
  } catch (e) {
    // Sem rede (ou DNS bloqueado) o fetch LANÇA em vez de devolver status. Sem
    // este catch a exceção sobe até o handler global e o admin vê "Erro
    // interno", que não diz nada sobre o que fazer.
    return {
      ok: false as const,
      erro: `Não consegui falar com a Graph API da Meta: ${(e as Error).message}`,
    };
  }
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    return {
      ok: false as const,
      erro: `Token recusado pela Meta (${res.status}): ${detalhe.slice(0, 200)}`,
    };
  }
  const data = (await res.json().catch(() => ({}))) as { name?: string };
  return { ok: true as const, nome: data.name ?? null };
}
