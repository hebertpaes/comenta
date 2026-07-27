import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "./http.js";

/**
 * Integração com a API da Anthropic (Claude) para o Comenta SaaS.
 *
 * Três capacidades de atendimento, todas com requisições únicas (sem streaming):
 *  - classifyConversation: classifica intenção, sentimento, urgência e categoria
 *  - summarizeConversation: resume o histórico para handoff entre atendentes
 *  - suggestReply: sugere uma resposta pronta para o atendente revisar e enviar
 *
 * Modelos são configuráveis por variável de ambiente. Padrões escolhidos para
 * custo baixo em alto volume (classificação/resumo em Haiku 4.5; sugestão de
 * resposta, que é voltada ao cliente, em Sonnet 5). Suba para Opus 4.8 se
 * quiser mais qualidade — ver README.
 */

const client = new Anthropic({
  // Lê ANTHROPIC_API_KEY do ambiente por padrão. Não fixe a chave em código.
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * A IA está realmente utilizável?
 *
 * Não basta a variável estar preenchida: o `.env` de exemplo vem com um
 * placeholder (`sk-ant-COLE_A_REAL`), e só checar "não vazio" fazia o /health
 * anunciar `ai: true` numa instalação onde toda chamada à Anthropic devolvia
 * 401. Chave real tem o prefixo `sk-ant-` e é bem mais longa que qualquer
 * placeholder — as duas condições juntas separam os casos sem falso negativo.
 */
export function aiEnabled(): boolean {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  return key.startsWith("sk-ant-") && key.length >= 40;
}

/**
 * Traduz erro do SDK da Anthropic em erro da nossa API.
 *
 * Sem isto qualquer falha vira "Erro interno" (500) no painel: o atendente vê
 * uma mensagem genérica e o administrador não descobre que o problema é a
 * chave. 401/403 viram 502 com instrução — é falha de configuração nossa, não
 * pedido inválido de quem clicou.
 */
function traduzErroAnthropic(e: unknown): never {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    throw new ApiError(
      502,
      "A Anthropic recusou a chave de API. Confira ANTHROPIC_API_KEY no .env da API e reinicie o container.",
      "ai_auth"
    );
  }
  if (e instanceof Anthropic.RateLimitError) {
    throw new ApiError(429, "Limite de uso da IA atingido — tente de novo em instantes.", "ai_rate_limit");
  }
  if (e instanceof Anthropic.APIConnectionError) {
    throw new ApiError(502, "Não consegui falar com a API da Anthropic.", "ai_offline");
  }
  throw e;
}

/** Envolve uma chamada ao Claude com a tradução de erro acima. */
async function chamarClaude(
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  if (!aiEnabled()) {
    throw new ApiError(503, "A IA não está configurada nesta instalação.", "ai_disabled");
  }
  try {
    return await client.messages.create(params);
  } catch (e) {
    traduzErroAnthropic(e);
  }
}

const MODEL_CLASSIFY = process.env.AI_MODEL_CLASSIFY ?? "claude-haiku-4-5";
const MODEL_SUMMARIZE = process.env.AI_MODEL_SUMMARIZE ?? "claude-haiku-4-5";
const MODEL_SUGGEST = process.env.AI_MODEL_SUGGEST ?? "claude-sonnet-5";

export type AiMessage = { direction: "in" | "out"; body: string };

function transcript(messages: AiMessage[], max = 40): string {
  return messages
    .slice(-max)
    .map((m) => `${m.direction === "in" ? "Cliente" : "Atendente"}: ${m.body}`)
    .join("\n");
}

function firstText(res: Anthropic.Message): string {
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

// ---- Classificação (structured output garante JSON válido) ------------------

export type Classification = {
  category: string;
  intent: string;
  sentiment: "positivo" | "neutro" | "negativo";
  urgency: "baixa" | "media" | "alta";
  summary: string;
};

const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      description: "Categoria do atendimento",
      enum: ["vendas", "suporte", "financeiro", "reclamacao", "duvida", "outro"],
    },
    intent: { type: "string", description: "Intenção do cliente em 2-5 palavras" },
    sentiment: { type: "string", enum: ["positivo", "neutro", "negativo"] },
    urgency: { type: "string", enum: ["baixa", "media", "alta"] },
    summary: { type: "string", description: "Resumo em uma frase" },
  },
  required: ["category", "intent", "sentiment", "urgency", "summary"],
  additionalProperties: false,
} as const;

export async function classifyConversation(messages: AiMessage[]): Promise<Classification> {
  const res = await chamarClaude({
    model: MODEL_CLASSIFY,
    max_tokens: 512,
    system:
      "Você classifica conversas de atendimento via WhatsApp de uma empresa brasileira. " +
      "Responda somente com o JSON solicitado, em português, sem texto adicional.",
    // structured outputs garantem JSON válido nos modelos que suportam;
    // o prompt também pede JSON puro para robustez entre versões de SDK/API.
    ...({
      output_config: { format: { type: "json_schema", schema: CLASSIFICATION_SCHEMA } },
    } as object),
    messages: [{ role: "user", content: `Classifique esta conversa:\n\n${transcript(messages)}` }],
  });
  return JSON.parse(extractJson(firstText(res))) as Classification;
}

/** Extrai o primeiro objeto JSON do texto (tolera cercas de código ou prosa). */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return candidate.trim();
  return candidate.slice(start, end + 1);
}

// ---- Resumo -----------------------------------------------------------------

export async function summarizeConversation(messages: AiMessage[]): Promise<string> {
  const res = await chamarClaude({
    model: MODEL_SUMMARIZE,
    max_tokens: 600,
    system:
      "Você resume conversas de atendimento para outro atendente assumir o caso. " +
      "Escreva em português, em tópicos curtos: contexto, o que o cliente quer, " +
      "o que já foi feito e próximo passo sugerido.",
    messages: [{ role: "user", content: `Resuma esta conversa:\n\n${transcript(messages)}` }],
  });
  return firstText(res).trim();
}

// ---- Sugestão de resposta ---------------------------------------------------

export async function suggestReply(
  messages: AiMessage[],
  opts: { companyName?: string; tone?: string } = {}
): Promise<string> {
  const tone = opts.tone ?? "cordial, objetivo e prestativo";
  const company = opts.companyName ?? "a empresa";
  const res = await chamarClaude({
    model: MODEL_SUGGEST,
    max_tokens: 700,
    system:
      `Você é um atendente de ${company} respondendo no WhatsApp. Tom: ${tone}. ` +
      "Escreva em português do Brasil uma única resposta pronta para enviar ao cliente, " +
      "sem placeholders entre colchetes e sem inventar dados que você não tem. " +
      "Se faltar informação para resolver, peça o que for necessário.",
    messages: [
      {
        role: "user",
        content: `Histórico da conversa:\n\n${transcript(messages)}\n\nEscreva a próxima resposta do atendente.`,
      },
    ],
  });
  return firstText(res).trim();
}

// ---- Autoatendimento por IA (WhatsApp / conversas) -------------------------
// A IA responde o cliente DIRETAMENTE numa conversa de atendimento e sinaliza
// quando o caso precisa de um humano (handoff). Diferente do chatAssistant
// (widget do site), aqui há base de conhecimento da empresa e decisão de handoff.

const MODEL_AUTOREPLY = process.env.AI_MODEL_AUTOREPLY ?? "claude-sonnet-5";

export type AutoReply = { reply: string; needsHuman: boolean };

const AUTOREPLY_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "Mensagem para enviar ao cliente, em português do Brasil",
    },
    needsHuman: {
      type: "boolean",
      description:
        "true se o caso precisa de um atendente humano (pedido explícito, negociação, dado sensível, ou fora do escopo da base de conhecimento)",
    },
  },
  required: ["reply", "needsHuman"],
  additionalProperties: false,
} as const;

export async function aiAutoReply(
  messages: AiMessage[],
  opts: { companyName?: string; knowledge?: string; tone?: string } = {}
): Promise<AutoReply> {
  const company = opts.companyName ?? "a empresa";
  const tone = opts.tone ?? "cordial, objetivo e prestativo";
  const kb = opts.knowledge
    ? `\n\n# Base de conhecimento da empresa (use como verdade)\n${opts.knowledge}`
    : "";
  const res = await chamarClaude({
    model: MODEL_AUTOREPLY,
    max_tokens: 700,
    system:
      `Você é o atendente virtual de ${company} e responde o cliente DIRETAMENTE no WhatsApp. ` +
      `Tom: ${tone}. Escreva em português do Brasil, curto e objetivo (1 a 4 frases). ` +
      `Resolva o que der com base no conhecimento abaixo. NUNCA invente preços, prazos, dados da conta ` +
      `ou políticas que não estejam na base — se não souber, seja honesto. ` +
      `Marque needsHuman=true quando: o cliente pedir explicitamente uma pessoa/atendente; ` +
      `precisar negociar contrato/valores; envolver dado sensível ou financeiro da conta; ` +
      `ou o pedido estiver claramente fora do que você consegue resolver. ` +
      `Quando needsHuman=true, escreva uma mensagem curta avisando que vai transferir para um atendente humano.${kb}`,
    ...({ output_config: { format: { type: "json_schema", schema: AUTOREPLY_SCHEMA } } } as object),
    messages: [
      {
        role: "user",
        content: `Histórico da conversa:\n\n${transcript(messages)}\n\nResponda o cliente agora (JSON com reply e needsHuman).`,
      },
    ],
  });
  const parsed = JSON.parse(extractJson(firstText(res))) as AutoReply;
  return { reply: String(parsed.reply || "").trim(), needsHuman: Boolean(parsed.needsHuman) };
}

// ---- Chat do assistente (site) ---------------------------------------------
// Conversa aberta com o cliente no widget do site. Diferente do suggestReply
// (voltado ao atendente), aqui a IA fala DIRETO com o visitante.

export type ChatTurn = { role: "user" | "assistant"; content: string };
const MODEL_CHAT = process.env.AI_MODEL_CHAT ?? "claude-sonnet-5";

export async function chatAssistant(
  history: ChatTurn[],
  opts: { companyName?: string; knowledge?: string } = {}
): Promise<string> {
  const company = opts.companyName ?? "Comenta";
  const kb = opts.knowledge ? `\n\n# Base de conhecimento da empresa\n${opts.knowledge}` : "";
  const res = await chamarClaude({
    model: MODEL_CHAT,
    max_tokens: 700,
    system:
      `Você é o assistente virtual do ${company}, uma plataforma brasileira de ` +
      `atendimento multicanal com IA (chat no site + WhatsApp + painel para os atendentes). ` +
      `Fale em português do Brasil, de forma cordial, curta e objetiva (2 a 5 frases). ` +
      `Ajude com dúvidas sobre planos, recursos, integrações, primeiros passos e uso do produto. ` +
      `Se o cliente pedir algo que exige um humano (negociar contrato, dado sensível/financeiro, ` +
      `um problema específico da conta), diga que pode transferir para um atendente e sugira o botão ` +
      `"Falar com um humano". Nunca invente preços, prazos ou políticas que não estejam na base de ` +
      `conhecimento — se não souber, admita e ofereça o atendimento humano.${kb}`,
    messages: history.slice(-20).map((t) => ({ role: t.role, content: t.content })),
  });
  return firstText(res).trim();
}
