import { z } from "zod";
import { recordInbound, resolverContatoExterno } from "./inbound.js";
import { mergeChannelConfig } from "./store.js";

/**
 * X (Twitter) — mensagens diretas e menções.
 *
 * Duas entradas, porque no X o cliente reclama nos dois lugares:
 *   • DM  — conversa privada, o análogo do Instagram Direct;
 *   • menção — o post público que cita a conta. Opcional (`capturarMencoes`),
 *     porque uma conta grande transformaria a caixa de entrada num mural.
 *
 * A resposta volta ONDE a pessoa falou: DM responde em DM, menção responde
 * publicamente naquele post. É `conversations.external_ref` que carrega essa
 * distinção — daí o prefixo (`dm:` / `tweet:`) na referência.
 *
 * SEM WEBHOOK. A Account Activity API, que empurrava DM em tempo real, é do
 * plano Enterprise; nos planos que uma PME assina só existe leitura. Por isso
 * a coleta é por polling (ver social.ts).
 *
 * LIMITE DA PLATAFORMA: os planos baixos do X contam requisição por MÊS, não
 * por minuto. É por isso que o intervalo padrão deste canal é bem mais longo
 * que o dos outros — ver X_POLL_MS em social.ts.
 */

const API = "https://api.x.com/2";
const TOKEN = `${API}/oauth2/token`;

/** Prefixo do `contacts.external_id` deste canal. Ver resolverContatoExterno. */
const PREFIXO = "x:";

export const XConfig = z.object({
  // `required_error` além do `.min(1)`: o primeiro cobre o campo AUSENTE, o
  // segundo o campo vazio. A mensagem sai direto no erro de POST /connect.
  /** ID numérico da conta (não o @). É o dono das DMs e das menções. */
  userId: z
    .string({ required_error: "Informe o ID numérico da conta no X" })
    .min(1, "Informe o ID numérico da conta no X"),
  /** Client ID do app no portal de desenvolvedores do X. */
  clientId: z
    .string({ required_error: "Informe o Client ID do app do X" })
    .min(1, "Informe o Client ID do app do X"),
  /** Client Secret do mesmo app. */
  clientSecret: z
    .string({ required_error: "Informe o Client Secret do app do X" })
    .min(1, "Informe o Client Secret do app do X"),
  /** Refresh token com escopos dm.read, dm.write, tweet.read, tweet.write. */
  refreshToken: z
    .string({ required_error: "Informe o Refresh Token autorizado pela conta" })
    .min(1, "Informe o Refresh Token autorizado pela conta"),
  /** Traz também os posts públicos que citam a conta. Desligado por padrão. */
  capturarMencoes: z.coerce.boolean().optional(),
  /** Cursor das DMs: id do último evento já importado. */
  lastDmId: z.string().optional(),
  /** Cursor das menções: id do último post já importado. */
  lastMentionId: z.string().optional(),
});
export type XConfig = z.infer<typeof XConfig>;

// ---- Token de acesso --------------------------------------------------------

/**
 * O X ROTACIONA o refresh token: cada renovação devolve um novo e invalida o
 * anterior. Perder o novo mata a conexão de vez — daí a gravação imediata no
 * config, antes mesmo de usar o access token.
 *
 * O cache é por conexão (e não pelo refresh token, como no YouTube) justamente
 * porque a chave muda a cada renovação. E a renovação em voo é compartilhada:
 * o coletor e um envio do atendente podem cair juntos aqui, e duas renovações
 * simultâneas invalidariam uma à outra.
 */
const tokens = new Map<string, { valor: string; expiraEm: number }>();
const emVoo = new Map<string, Promise<string>>();

export async function accessToken(canalId: string, cfg: XConfig): Promise<string> {
  const cache = tokens.get(canalId);
  if (cache && cache.expiraEm > Date.now() + 60_000) return cache.valor;

  const jaRodando = emVoo.get(canalId);
  if (jaRodando) return jaRodando;

  const p = (async () => {
    const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
    const res = await fetch(TOKEN, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: cfg.refreshToken,
        client_id: cfg.clientId,
      }),
    });
    if (!res.ok) {
      const detalhe = await res.text().catch(() => "");
      throw new Error(`X recusou o refresh token (${res.status}): ${detalhe.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) throw new Error("X respondeu sem access_token");

    if (data.refresh_token && data.refresh_token !== cfg.refreshToken) {
      cfg.refreshToken = data.refresh_token;
      await mergeChannelConfig(canalId, { refreshToken: data.refresh_token });
    }
    tokens.set(canalId, {
      valor: data.access_token,
      expiraEm: Date.now() + (data.expires_in ?? 7200) * 1000,
    });
    return data.access_token;
  })().finally(() => emVoo.delete(canalId));

  emVoo.set(canalId, p);
  return p;
}

/** Esquece os access tokens em cache. Usado nos testes e ao desconectar. */
export function limparTokens() {
  tokens.clear();
  emVoo.clear();
}

// ---- Cursores ---------------------------------------------------------------

/**
 * Ids do X são snowflakes: crescentes, mas com tamanhos diferentes ao longo do
 * tempo. Comparar como STRING diria que "999" é maior que "1000000000000000000"
 * e o cursor pararia de andar — por isso BigInt.
 */
export function maiorId(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  try {
    return BigInt(a) >= BigInt(b) ? a : b;
  } catch {
    return a;
  }
}

const depoisDe = (id: string, cursor: string | undefined) => {
  if (!cursor) return false;
  try {
    return BigInt(id) > BigInt(cursor);
  } catch {
    return false;
  }
};

// ---- Entrada: DMs -----------------------------------------------------------

const DmEvents = z.object({
  data: z
    .array(
      z.object({
        id: z.string(),
        event_type: z.string().optional(),
        text: z.string().optional(),
        sender_id: z.string().optional(),
        dm_conversation_id: z.string().optional(),
      })
    )
    .default([]),
  includes: z
    .object({
      users: z.array(z.object({ id: z.string(), name: z.string().optional() })).default([]),
    })
    .optional(),
});

const Mentions = z.object({
  data: z
    .array(
      z.object({ id: z.string(), text: z.string().optional(), author_id: z.string().optional() })
    )
    .default([]),
  includes: z
    .object({
      users: z.array(z.object({ id: z.string(), name: z.string().optional() })).default([]),
    })
    .optional(),
});

/** Uma mensagem coletada, já indiferente a ter vindo de DM ou de menção. */
export type MensagemColetada = {
  id: string;
  origem: "dm" | "mention";
  autorId: string;
  autorNome: string;
  texto: string;
  /** Alvo de resposta: `dm:<conversa>` ou `tweet:<post>`. */
  externalRef: string;
};

async function chamar(url: string, token: string, oque: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 429) {
    // O plano baixo do X conta por mês. Estourar não é erro de configuração —
    // é só esperar a janela virar, então o coletor não derruba a conexão.
    throw Object.assign(new Error(`X limitou a leitura de ${oque} (429)`), { rateLimited: true });
  }
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`X recusou a leitura de ${oque} (${res.status}): ${detalhe.slice(0, 200)}`);
  }
  return res.json();
}

/** Achata o retorno de `/2/dm_events` em mensagens, do mais antigo ao mais novo. */
export function achatarDms(corpo: unknown, cfg: Pick<XConfig, "userId">): MensagemColetada[] {
  const parsed = DmEvents.safeParse(corpo);
  if (!parsed.success) return [];
  const nomes = new Map(parsed.data.includes?.users.map((u) => [u.id, u.name]) ?? []);

  return (
    parsed.data.data
      .filter((e) => (e.event_type ?? "MessageCreate") === "MessageCreate")
      // A própria conta aparece no fio: são as nossas respostas voltando na
      // leitura seguinte. Registrar criaria uma mensagem de entrada duplicada.
      .filter((e) => e.sender_id && e.sender_id !== cfg.userId)
      .filter((e) => (e.text ?? "").trim() && e.dm_conversation_id)
      .map((e) => ({
        id: e.id,
        origem: "dm" as const,
        autorId: e.sender_id!,
        autorNome: nomes.get(e.sender_id!)?.trim() || "Contato X",
        texto: e.text!.trim(),
        externalRef: `dm:${e.dm_conversation_id}`,
      }))
      .sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1))
  );
}

/** Achata o retorno de `/2/users/:id/mentions`, do mais antigo ao mais novo. */
export function achatarMencoes(corpo: unknown, cfg: Pick<XConfig, "userId">): MensagemColetada[] {
  const parsed = Mentions.safeParse(corpo);
  if (!parsed.success) return [];
  const nomes = new Map(parsed.data.includes?.users.map((u) => [u.id, u.name]) ?? []);

  return parsed.data.data
    .filter((t) => t.author_id && t.author_id !== cfg.userId)
    .filter((t) => (t.text ?? "").trim())
    .map((t) => ({
      id: t.id,
      origem: "mention" as const,
      autorId: t.author_id!,
      autorNome: nomes.get(t.author_id!)?.trim() || "Contato X",
      texto: t.text!.trim(),
      externalRef: `tweet:${t.id}`,
    }))
    .sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
}

async function lerDms(cfg: XConfig, token: string) {
  const url =
    `${API}/dm_events?max_results=50&event_types=MessageCreate` +
    `&dm_event.fields=id,text,sender_id,dm_conversation_id,event_type` +
    `&expansions=sender_id&user.fields=name`;
  return achatarDms(await chamar(url, token, "DMs"), cfg);
}

async function lerMencoes(cfg: XConfig, token: string) {
  const desde = cfg.lastMentionId ? `&since_id=${encodeURIComponent(cfg.lastMentionId)}` : "";
  const url =
    `${API}/users/${encodeURIComponent(cfg.userId)}/mentions?max_results=50` +
    `&tweet.fields=id,text,author_id&expansions=author_id&user.fields=name${desde}`;
  return achatarMencoes(await chamar(url, token, "menções"), cfg);
}

/**
 * Uma passada de coleta numa conexão. Devolve quantas mensagens entraram.
 *
 * Na PRIMEIRA passada (sem cursor) nada é importado: só marcamos onde estamos.
 * Sem isso, conectar a conta despejaria o histórico inteiro de DMs e menções na
 * caixa de entrada como se fosse tudo novo.
 */
export async function coletar(canal: {
  id: string;
  companyId: string;
  config: Record<string, unknown>;
}): Promise<number> {
  const cfg = XConfig.parse(canal.config);
  const token = await accessToken(canal.id, cfg);

  const dms = await lerDms(cfg, token);
  const mencoes = cfg.capturarMencoes ? await lerMencoes(cfg, token) : [];

  const cursores: Record<string, unknown> = {};
  const aImportar: MensagemColetada[] = [];

  const fatiar = (lista: MensagemColetada[], cursor: string | undefined, campo: string) => {
    const topo = lista.reduce<string | undefined>((acc, m) => maiorId(acc, m.id), undefined);
    const novoCursor = maiorId(cursor, topo);
    if (novoCursor && novoCursor !== cursor) cursores[campo] = novoCursor;
    if (!cursor) return; // primeira passada: só marca a posição
    aImportar.push(...lista.filter((m) => depoisDe(m.id, cursor)));
  };

  fatiar(dms, cfg.lastDmId, "lastDmId");
  fatiar(mencoes, cfg.lastMentionId, "lastMentionId");

  aImportar.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  for (const m of aImportar) {
    const contato = await resolverContatoExterno(
      canal.companyId,
      PREFIXO + m.autorId,
      "x",
      m.autorNome
    );
    await recordInbound(canal.companyId, contato, m.texto, canal.id, m.externalRef);
  }

  // Cursor gravado DEPOIS de registrar: se o processo cair no meio, a próxima
  // passada reimporta em vez de perder a mensagem de um cliente.
  if (Object.keys(cursores).length) await mergeChannelConfig(canal.id, cursores);
  return aImportar.length;
}

// ---- Saída ------------------------------------------------------------------

/**
 * Entrega a resposta no MESMO lugar em que o cliente falou.
 *
 * `externalRef` diz onde foi: `tweet:` responde publicamente naquele post,
 * `dm:` responde na conversa privada. Sem referência (conversa que começou em
 * outro canal e migrou), abrimos uma DM com a pessoa — o caminho privado é o
 * único seguro para responder algo que ninguém pediu em público.
 */
export async function responder(
  canalId: string,
  cfg: XConfig,
  alvo: { externalRef: string | null; autorId: string },
  body: string
) {
  const token = await accessToken(canalId, cfg);
  const ref = alvo.externalRef ?? "";

  let url: string;
  let corpo: Record<string, unknown>;
  if (ref.startsWith("tweet:")) {
    url = `${API}/tweets`;
    corpo = { text: body, reply: { in_reply_to_tweet_id: ref.slice("tweet:".length) } };
  } else if (ref.startsWith("dm:")) {
    url = `${API}/dm_conversations/${encodeURIComponent(ref.slice("dm:".length))}/messages`;
    corpo = { text: body };
  } else {
    url = `${API}/dm_conversations/with/${encodeURIComponent(alvo.autorId)}/messages`;
    corpo = { text: body };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`X recusou o envio (${res.status}): ${detalhe.slice(0, 200)}`);
  }
}

/** Tira o prefixo `x:` do external_id do contato. */
export const idDoAutor = (externalId: string) =>
  externalId.startsWith(PREFIXO) ? externalId.slice(PREFIXO.length) : externalId;

// ---- Teste de credenciais ---------------------------------------------------

/**
 * Confere que o refresh token funciona E que ele é da conta informada. Um token
 * válido de OUTRA conta autentica, mas leria as DMs erradas — o painel estaria
 * verde para uma conexão apontando para a caixa de entrada de outra pessoa.
 */
export async function testarCredenciais(canalId: string, cfg: XConfig) {
  let token: string;
  try {
    token = await accessToken(canalId, cfg);
  } catch (e) {
    return { ok: false as const, erro: (e as Error).message };
  }

  let res: Response;
  try {
    res = await fetch(`${API}/users/me?user.fields=username,name`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    // Sem rede o fetch LANÇA em vez de devolver status. Sem este catch a
    // exceção sobe até o handler global e o admin vê só "Erro interno".
    return {
      ok: false as const,
      erro: `Não consegui falar com a API do X: ${(e as Error).message}`,
    };
  }
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    return {
      ok: false as const,
      erro: `X recusou as credenciais (${res.status}): ${detalhe.slice(0, 200)}`,
    };
  }

  const data = (await res.json().catch(() => ({}))) as {
    data?: { id?: string; username?: string; name?: string };
  };
  const eu = data.data;
  if (!eu?.id) return { ok: false as const, erro: "O X respondeu sem identificar a conta." };
  if (eu.id !== cfg.userId) {
    return {
      ok: false as const,
      erro: `O Refresh Token é da conta ${eu.id} (@${eu.username ?? "?"}), e não da ${cfg.userId} informada.`,
    };
  }
  return { ok: true as const, nome: eu.username ? `@${eu.username}` : (eu.name ?? null) };
}
