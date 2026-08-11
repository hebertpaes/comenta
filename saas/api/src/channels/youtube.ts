import { z } from "zod";
import { recordInbound, resolverContatoExterno } from "./inbound.js";
import { mergeChannelConfig } from "./store.js";

/**
 * YouTube — comentários dos vídeos do canal.
 *
 * O YouTube NÃO tem mensagem privada: não existe API de DM, e a que existia
 * (`messages.insert`) foi desligada em 2017. A única conversa pública com a
 * audiência são os comentários — que é justamente o que esta plataforma trata.
 * Então aqui "mensagem que chega" = comentário novo em qualquer vídeo do canal,
 * e "resposta do atendente" = resposta pública naquela thread.
 *
 * SEM WEBHOOK. O YouTube só oferece PubSubHubbub para VÍDEO novo, nunca para
 * comentário. Não existe push: a coleta é por polling (ver social.ts), e o
 * cursor `lastCommentAt` no config é o que impede reimportar o que já entrou.
 *
 * OAuth, não API key. Ler comentário até dá com chave de API, mas RESPONDER
 * exige contexto de usuário (escopo `youtube.force-ssl`) — e uma conexão que
 * só lê não serviria para atendimento. Por isso a conexão pede o trio
 * clientId/clientSecret/refreshToken do app do Google Cloud da empresa.
 */

const API = "https://www.googleapis.com/youtube/v3";
const OAUTH = "https://oauth2.googleapis.com/token";

/** Prefixo do `contacts.external_id` deste canal. Ver resolverContatoExterno. */
const PREFIXO = "yt:";

export const YoutubeConfig = z.object({
  // `required_error` além do `.min(1)`: o primeiro cobre o campo AUSENTE, o
  // segundo o campo vazio. A mensagem sai direto no erro de POST /connect.
  /** ID do canal do YouTube (começa com UC…). Dono dos vídeos e dos comentários. */
  channelId: z
    .string({ required_error: "Informe o ID do canal do YouTube (começa com UC…)" })
    .min(1, "Informe o ID do canal do YouTube (começa com UC…)"),
  /** Client ID do app OAuth no Google Cloud. */
  clientId: z
    .string({ required_error: "Informe o Client ID do app do Google" })
    .min(1, "Informe o Client ID do app do Google"),
  /** Client Secret do mesmo app. */
  clientSecret: z
    .string({ required_error: "Informe o Client Secret do app do Google" })
    .min(1, "Informe o Client Secret do app do Google"),
  /** Refresh token do dono do canal, com escopo youtube.force-ssl. */
  refreshToken: z
    .string({ required_error: "Informe o Refresh Token autorizado pelo dono do canal" })
    .min(1, "Informe o Refresh Token autorizado pelo dono do canal"),
  /** Cursor: publishedAt do comentário mais recente já importado (ISO). */
  lastCommentAt: z.string().optional(),
});
export type YoutubeConfig = z.infer<typeof YoutubeConfig>;

// ---- Token de acesso --------------------------------------------------------

/**
 * Access token vale 1h; o refresh token é permanente. Guardamos o access em
 * memória por refresh token para não trocar credencial a cada passada do
 * coletor — o Google contabiliza essas trocas e derruba por abuso.
 *
 * A margem de 60s evita usar um token que expira no meio da requisição.
 */
const tokens = new Map<string, { valor: string; expiraEm: number }>();

export async function accessToken(cfg: YoutubeConfig): Promise<string> {
  const cache = tokens.get(cfg.refreshToken);
  if (cache && cache.expiraEm > Date.now() + 60_000) return cache.valor;

  const res = await fetch(OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Google recusou o refresh token (${res.status}): ${detalhe.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google respondeu sem access_token");
  tokens.set(cfg.refreshToken, {
    valor: data.access_token,
    expiraEm: Date.now() + (data.expires_in ?? 3600) * 1000,
  });
  return data.access_token;
}

/** Esquece o access token em cache. Usado nos testes e ao desconectar. */
export function limparTokens() {
  tokens.clear();
}

// ---- Entrada ----------------------------------------------------------------

const Comentario = z.object({
  id: z.string(),
  snippet: z.object({
    textOriginal: z.string().optional(),
    textDisplay: z.string().optional(),
    authorDisplayName: z.string().optional(),
    authorChannelId: z.object({ value: z.string() }).optional(),
    publishedAt: z.string().optional(),
  }),
});

const Threads = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({ topLevelComment: Comentario }),
        replies: z.object({ comments: z.array(Comentario).default([]) }).optional(),
      })
    )
    .default([]),
});

/** Um comentário achatado, já sem a diferença entre topo de thread e resposta. */
export type ComentarioColetado = {
  /** Id do comentário em si — só para log e desempate. */
  id: string;
  /** Id da THREAD: é o único alvo que a API aceita para responder. */
  threadId: string;
  autorId: string;
  autorNome: string;
  texto: string;
  publicadoEm: string;
};

/**
 * Achata a resposta de `commentThreads` em comentários individuais.
 *
 * As respostas DENTRO da thread contam: quando o cliente insiste, ele responde
 * no próprio fio em vez de abrir outro. Todas apontam para o mesmo `threadId`
 * porque o YouTube só aceita responder no nível da thread.
 */
export function achatarThreads(corpo: unknown): ComentarioColetado[] {
  const parsed = Threads.safeParse(corpo);
  if (!parsed.success) return [];

  const saida: ComentarioColetado[] = [];
  const empurrar = (c: z.infer<typeof Comentario>, threadId: string) => {
    const texto = (c.snippet.textOriginal ?? c.snippet.textDisplay ?? "").trim();
    const autorId = c.snippet.authorChannelId?.value;
    if (!texto || !autorId) return;
    saida.push({
      id: c.id,
      threadId,
      autorId,
      autorNome: c.snippet.authorDisplayName?.trim() || "Contato YouTube",
      texto,
      publicadoEm: c.snippet.publishedAt ?? new Date(0).toISOString(),
    });
  };

  for (const item of parsed.data.items) {
    empurrar(item.snippet.topLevelComment, item.id);
    for (const r of item.replies?.comments ?? []) empurrar(r, item.id);
  }
  return saida;
}

/** Busca as threads mais recentes do canal (mais novas primeiro). */
export async function buscarComentarios(cfg: YoutubeConfig): Promise<ComentarioColetado[]> {
  const token = await accessToken(cfg);
  const url =
    `${API}/commentThreads?part=snippet,replies&order=time&maxResults=50` +
    `&allThreadsRelatedToChannelId=${encodeURIComponent(cfg.channelId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`YouTube recusou a leitura (${res.status}): ${detalhe.slice(0, 200)}`);
  }
  return achatarThreads(await res.json());
}

/**
 * Decide o que importar e qual passa a ser o cursor.
 *
 * Na PRIMEIRA passada (sem cursor) nada é importado: só marcamos onde estamos.
 * Sem isso, conectar o canal despejaria todo o histórico de comentários do
 * YouTube na caixa de entrada como se fossem mensagens novas.
 *
 * Comentários do próprio canal são descartados: são as nossas respostas
 * voltando na leitura seguinte.
 */
export function filtrarNovos(
  comentarios: ComentarioColetado[],
  cfg: Pick<YoutubeConfig, "channelId" | "lastCommentAt">
): { novos: ComentarioColetado[]; cursor: string | null } {
  const daAudiencia = comentarios.filter((c) => c.autorId !== cfg.channelId);
  const maisNovo = daAudiencia.reduce<string | null>(
    (acc, c) => (acc === null || c.publicadoEm > acc ? c.publicadoEm : acc),
    null
  );

  if (!cfg.lastCommentAt) return { novos: [], cursor: maisNovo };

  const novos = daAudiencia
    .filter((c) => c.publicadoEm > cfg.lastCommentAt!)
    // Ordem cronológica: a conversa tem que aparecer no painel na ordem em que
    // foi escrita, e o `externalRef` da última é o que fica valendo.
    .sort((a, b) => a.publicadoEm.localeCompare(b.publicadoEm));

  return { novos, cursor: maisNovo && maisNovo > cfg.lastCommentAt ? maisNovo : cfg.lastCommentAt };
}

/** Uma passada de coleta numa conexão. Devolve quantos comentários entraram. */
export async function coletar(canal: {
  id: string;
  companyId: string;
  config: Record<string, unknown>;
}): Promise<number> {
  const cfg = YoutubeConfig.parse(canal.config);
  const { novos, cursor } = filtrarNovos(await buscarComentarios(cfg), cfg);

  for (const c of novos) {
    const contato = await resolverContatoExterno(
      canal.companyId,
      PREFIXO + c.autorId,
      "youtube",
      c.autorNome
    );
    await recordInbound(canal.companyId, contato, c.texto, canal.id, c.threadId);
  }

  // Grava o cursor DEPOIS de registrar: se o processo cair no meio, a próxima
  // passada reimporta em vez de perder comentário. Duplicar é recuperável,
  // sumir com a mensagem de um cliente não é.
  if (cursor && cursor !== cfg.lastCommentAt) {
    await mergeChannelConfig(canal.id, { lastCommentAt: cursor });
  }
  return novos.length;
}

// ---- Saída ------------------------------------------------------------------

/**
 * Responde publicamente na thread do comentário.
 *
 * `parentId` é o id da THREAD, não o do comentário respondido: o YouTube não
 * tem resposta aninhada em segundo nível — tudo que responde a um fio fica
 * pendurado no comentário de topo.
 */
export async function responder(cfg: YoutubeConfig, threadId: string, body: string) {
  const token = await accessToken(cfg);
  const res = await fetch(`${API}/comments?part=snippet`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ snippet: { parentId: threadId, textOriginal: body } }),
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`YouTube recusou a resposta (${res.status}): ${detalhe.slice(0, 200)}`);
  }
}

/** Tira o prefixo `yt:` do external_id do contato. */
export const idDoAutor = (externalId: string) =>
  externalId.startsWith(PREFIXO) ? externalId.slice(PREFIXO.length) : externalId;

// ---- Teste de credenciais ---------------------------------------------------

/**
 * Confere que o refresh token funciona E que ele dá acesso ao canal informado.
 * As duas coisas: um token válido do Google que não seja do dono do canal
 * autentica, mas não consegue responder comentário nenhum — e o painel estaria
 * mostrando verde para uma conexão que só falha na hora de atender.
 */
export async function testarCredenciais(cfg: YoutubeConfig) {
  let token: string;
  try {
    token = await accessToken(cfg);
  } catch (e) {
    return { ok: false as const, erro: (e as Error).message };
  }

  let res: Response;
  try {
    res = await fetch(`${API}/channels?part=snippet&mine=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    // Sem rede o fetch LANÇA em vez de devolver status. Sem este catch a
    // exceção sobe até o handler global e o admin vê só "Erro interno".
    return {
      ok: false as const,
      erro: `Não consegui falar com a API do YouTube: ${(e as Error).message}`,
    };
  }
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    return {
      ok: false as const,
      erro: `YouTube recusou as credenciais (${res.status}): ${detalhe.slice(0, 200)}`,
    };
  }

  const data = (await res.json().catch(() => ({}))) as {
    items?: { id?: string; snippet?: { title?: string } }[];
  };
  const meu = data.items?.[0];
  if (!meu?.id) {
    return {
      ok: false as const,
      erro: "O Refresh Token autenticou, mas não está ligado a nenhum canal do YouTube.",
    };
  }
  if (meu.id !== cfg.channelId) {
    return {
      ok: false as const,
      erro: `O Refresh Token é do canal ${meu.id}, e não do ${cfg.channelId} informado.`,
    };
  }
  return { ok: true as const, nome: meu.snippet?.title ?? null };
}
