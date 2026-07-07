import Anthropic from "@anthropic-ai/sdk";

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

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

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
  const res = await client.messages.create({
    model: MODEL_CLASSIFY,
    max_tokens: 512,
    system:
      "Você classifica conversas de atendimento via WhatsApp de uma empresa brasileira. " +
      "Responda somente com o JSON solicitado, em português, sem texto adicional.",
    // structured outputs garantem JSON válido nos modelos que suportam;
    // o prompt também pede JSON puro para robustez entre versões de SDK/API.
    ...({ output_config: { format: { type: "json_schema", schema: CLASSIFICATION_SCHEMA } } } as object),
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
  const res = await client.messages.create({
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
  const res = await client.messages.create({
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
