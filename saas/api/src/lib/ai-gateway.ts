import { ApiError } from "./http.js";

export type AIProvider = "google" | "openai" | "anthropic" | "deepseek" | "groq" | "ollama" | "github" | "meta" | "manus";

export type AIProviderConfig = {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

/**
 * Gateway Multi-Provedor de Inteligência Artificial.
 * Recebe chamadas de qualquer API de IA externa ou servidor local Ollama / GitHub Runner.
 */
export async function queryAIProvider(
  provider: AIProvider,
  prompt: string,
  systemPrompt?: string,
  customConfig?: Partial<AIProviderConfig>
): Promise<string> {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  // 1. Google Gemini API
  if (provider === "google") {
    const key = customConfig?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
    const model = customConfig?.model || process.env.GOOGLE_AI_MODEL || "gemini-1.5-flash";
    if (!key) throw new ApiError(400, "Chave da API do Google Gemini não configurada.");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });
    if (!res.ok) throw new ApiError(502, `Erro na API do Google Gemini: ${res.statusText}`);
    const data = (await res.json()) as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  // 2. OpenAI (ChatGPT / GPT-4o)
  if (provider === "openai") {
    const key = customConfig?.apiKey || process.env.OPENAI_API_KEY || "";
    const model = customConfig?.model || "gpt-4o-mini";
    if (!key) throw new ApiError(400, "Chave da API da OpenAI não configurada.");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt }
        ]
      })
    });
    if (!res.ok) throw new ApiError(502, `Erro na API da OpenAI: ${res.statusText}`);
    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  // 3. DeepSeek V3 / R1 API
  if (provider === "deepseek") {
    const key = customConfig?.apiKey || process.env.DEEPSEEK_API_KEY || "";
    const model = customConfig?.model || "deepseek-chat";
    if (!key) throw new ApiError(400, "Chave da API da DeepSeek não configurada.");

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt }
        ]
      })
    });
    if (!res.ok) throw new ApiError(502, `Erro na API do DeepSeek: ${res.statusText}`);
    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  // 4. Groq Ultra-Fast LLaMA 3.3
  if (provider === "groq") {
    const key = customConfig?.apiKey || process.env.GROQ_API_KEY || "";
    const model = customConfig?.model || "llama-3.3-70b-versatile";
    if (!key) throw new ApiError(400, "Chave da API da Groq não configurada.");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt }
        ]
      })
    });
    if (!res.ok) throw new ApiError(502, `Erro na API da Groq: ${res.statusText}`);
    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  // 5. Servidor Local Ollama (Local LLM sem dependência de nuvem)
  if (provider === "ollama") {
    const baseUrl = customConfig?.baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const model = customConfig?.model || "llama3";

    try {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: fullPrompt, stream: false })
      });
      if (!res.ok) throw new Error(res.statusText);
      const data = (await res.json()) as any;
      return data.response?.trim() || "";
    } catch {
      throw new ApiError(502, `Servidor Local Ollama inacessível em ${baseUrl}. Inicie o 'ollama run llama3'.`);
    }
  }

  // 6. GitHub Models API / GitHub Copilot Runner
  if (provider === "github") {
    const token = customConfig?.apiKey || process.env.GITHUB_TOKEN || "";
    const model = customConfig?.model || "gpt-4o";
    if (!token) throw new ApiError(400, "Token do GitHub Models não configurado.");

    const res = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt }
        ]
      })
    });
    if (!res.ok) throw new ApiError(502, `Erro na API do GitHub Models: ${res.statusText}`);
    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  throw new ApiError(400, `Provedor de IA desconhecido: ${provider}`);
}
