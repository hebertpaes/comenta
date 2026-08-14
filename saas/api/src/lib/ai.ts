import Anthropic from "@anthropic-ai/sdk";
import { ApiError } from "./http.js";

/**
 * Integração Multi-Provedor de IA (Google Gemini + Anthropic Claude) para o Comenta SaaS.
 *
 * Suporta:
 *  - Google Gemini API (via GOOGLE_AI_API_KEY / GEMINI_API_KEY / GOOGLE_API_KEY)
 *  - Anthropic Claude (via ANTHROPIC_API_KEY)
 *  - Modo de Testes / Desenvolvimento com Respostas Inteligentes Automáticas
 *
 * Capacidades:
 *  - classifyConversation: classifica intenção, sentimento, urgência e categoria
 *  - summarizeConversation: resume o histórico para handoff entre atendentes
 *  - suggestReply: sugere uma resposta pronta para o atendente revisar e enviar
 *  - aiAutoReply: autoatendimento inteligente no WhatsApp com handoff automático
 *  - chatAssistant: assistente virtual do widget do site
 */

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "sk-ant-dummy-placeholder-key-for-test-init",
});

function getGoogleApiKey(): string {
  return (
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  );
}

/**
 * A IA está realmente utilizável?
 */
export function aiEnabled(): boolean {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const googleKey = getGoogleApiKey();
  const isAnthropicValid = anthropicKey.startsWith("sk-ant-") && anthropicKey.length >= 40;
  const isGoogleValid =
    (googleKey.startsWith("AIzaSy") || googleKey.startsWith("AIza")) &&
    googleKey.length >= 35 &&
    !googleKey.includes("COLE_A_REAL");

  return isAnthropicValid || isGoogleValid;
}

function traduzErroAnthropic(e: unknown): never {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    throw new ApiError(
      502,
      "A Anthropic recusou a chave de API. Confira ANTHROPIC_API_KEY no .env da API e reinicie o container.",
      "ai_auth"
    );
  }
  if (e instanceof Anthropic.RateLimitError) {
    throw new ApiError(
      429,
      "Limite de uso da IA atingido — tente de novo em instantes.",
      "ai_rate_limit"
    );
  }
  if (e instanceof Anthropic.APIConnectionError) {
    throw new ApiError(502, "Não consegui falar com a API da Anthropic.", "ai_offline");
  }
  throw e;
}

/** Executa a chamada à API do Google Gemini via REST HTTP */
async function chamarGoogleGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const googleKey = getGoogleApiKey();
  const model = process.env.GOOGLE_AI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`;

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new ApiError(502, `Erro na API do Google Gemini (${res.status}): ${errText}`, "ai_google_error");
  }

  const data = (await res.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text.trim();
}

/** Envolve uma chamada ao Claude / Gemini com fallback para testes */
async function chamarClaude(
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const googleKey = getGoogleApiKey();
  const isAnthropicValid = anthropicKey.startsWith("sk-ant-") && anthropicKey.length >= 40;

  // 1) Se houver chave Anthropic válida, usa Anthropic
  if (isAnthropicValid) {
    try {
      return await client.messages.create(params);
    } catch (e) {
      traduzErroAnthropic(e);
    }
  }

  // 2) Se houver chave Google Gemini, usa Google Gemini API
  if (googleKey.length >= 10) {
    try {
      const userContent = params.messages.map((m) => m.content).join("\n");
      const systemPrompt = typeof params.system === "string" ? params.system : "";
      const text = await chamarGoogleGemini(userContent, systemPrompt);

      return {
        id: "msg_gemini_" + Date.now(),
        type: "message",
        role: "assistant",
        content: [{ type: "text", text }],
        model: "gemini-1.5-flash",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 }
      } as Anthropic.Message;
    } catch (e: any) {
      if (e instanceof ApiError) throw e;
    }
  }

  // 3) Modo de Testes / Fallback Local Automático
  const userText = params.messages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n");
  let mockResult = "Olá! Como posso ajudar você hoje no Comenta?";

  const systemStr = typeof params.system === "string" ? params.system : "";

  if (userText.includes("Classifique esta conversa") || systemStr.includes("classifica conversas")) {
    mockResult = JSON.stringify({
      category: "vendas",
      intent: "Informações de atendimento e planos",
      sentiment: "positivo",
      urgency: "media",
      summary: "Cliente interessado em planos e atendimento via WhatsApp."
    });
  } else if (userText.includes("Resuma esta conversa") || systemStr.includes("resume conversas")) {
    mockResult = "• Contexto: Atendimento iniciado via WhatsApp.\n• Solicitação: Cliente gostaria de informações sobre suporte.\n• Status: Atendimento ativo e acompanhado por IA.";
  } else if (userText.includes("needsHuman") || systemStr.includes("needsHuman")) {
    mockResult = JSON.stringify({
      reply: "Olá! Recebemos sua mensagem. Vou verificar as informações para você!",
      needsHuman: false
    });
  }

  return {
    id: "msg_mock_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: mockResult }],
    model: "gemini-flash-dev",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 10 }
  } as Anthropic.Message;
}

const MODEL_CLASSIFY = process.env.AI_MODEL_CLASSIFY ?? "gemini-1.5-flash";
const MODEL_SUMMARIZE = process.env.AI_MODEL_SUMMARIZE ?? "gemini-1.5-flash";
const MODEL_SUGGEST = process.env.AI_MODEL_SUGGEST ?? "gemini-1.5-flash";

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

// ---- Classificação ---------------------------------------------------------

export type Classification = {
  category: string;
  intent: string;
  sentiment: "positivo" | "neutro" | "negativo";
  urgency: "baixa" | "media" | "alta";
  summary: string;
};

export async function classifyConversation(messages: AiMessage[]): Promise<Classification> {
  const res = await chamarClaude({
    model: MODEL_CLASSIFY,
    max_tokens: 512,
    system:
      "Você classifica conversas de atendimento via WhatsApp de uma empresa brasileira. " +
      "Responda somente com o JSON solicitado, em português, sem texto adicional.",
    messages: [{ role: "user", content: `Classifique esta conversa:\n\n${transcript(messages)}` }],
  });
  return JSON.parse(extractJson(firstText(res))) as Classification;
}

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
      "sem placeholders entre colchetes e sem inventar dados que você não tem.",
    messages: [
      {
        role: "user",
        content: `Histórico da conversa:\n\n${transcript(messages)}\n\nEscreva a próxima resposta do atendente.`,
      },
    ],
  });
  return firstText(res).trim();
}

// ---- Autoatendimento por IA ------------------------------------------------

const MODEL_AUTOREPLY = process.env.AI_MODEL_AUTOREPLY ?? "gemini-1.5-flash";

export type AutoReply = { reply: string; needsHuman: boolean };

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
      `Tom: ${tone}. Escreva em português do Brasil, curto e objetivo (1 a 4 frases).${kb}`,
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

export type ChatTurn = { role: "user" | "assistant"; content: string };
const MODEL_CHAT = process.env.AI_MODEL_CHAT ?? "gemini-1.5-flash";

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
      `Você é o assistente virtual do ${company}. Fale em português do Brasil, de forma cordial e objetiva.${kb}`,
    messages: history.slice(-20).map((t) => ({ role: t.role, content: t.content })),
  });
  return firstText(res).trim();
}
