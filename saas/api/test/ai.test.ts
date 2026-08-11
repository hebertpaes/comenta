import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `aiEnabled` decide se o painel anuncia a IA como disponível. Um falso
 * positivo aqui é caro: o /health diz `ai: true`, o atendente clica em "sugerir
 * resposta" e recebe um erro genérico, sem ninguém descobrir que a chave é o
 * placeholder do .env de exemplo.
 *
 * O módulo lê a variável no import, então cada caso precisa de import limpo.
 */
async function comChave(valor: string | undefined) {
  vi.resetModules();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  if (valor === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = valor;
  return import("../src/lib/ai.js");
}

const CHAVE_REAL = "sk-ant-api03-" + "x".repeat(80);

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
});

describe("aiEnabled", () => {
  it("aceita uma chave com formato real", async () => {
    const { aiEnabled } = await comChave(CHAVE_REAL);
    expect(aiEnabled()).toBe(true);
  });

  it("recusa a variável ausente", async () => {
    const { aiEnabled } = await comChave(undefined);
    expect(aiEnabled()).toBe(false);
  });

  it("recusa a variável vazia", async () => {
    const { aiEnabled } = await comChave("");
    expect(aiEnabled()).toBe(false);
  });

  // O caso que motivou a checagem: o .env de exemplo traz este valor, e o
  // /health anunciava `ai: true` enquanto toda chamada devolvia 401.
  it("recusa o placeholder do .env de exemplo", async () => {
    const { aiEnabled } = await comChave("sk-ant-COLE_A_REAL");
    expect(aiEnabled()).toBe(false);
  });

  it("recusa um valor longo sem o prefixo da Anthropic", async () => {
    const { aiEnabled } = await comChave("a".repeat(120));
    expect(aiEnabled()).toBe(false);
  });

  it("recusa o prefixo certo com tamanho de placeholder", async () => {
    const { aiEnabled } = await comChave("sk-ant-TROQUE");
    expect(aiEnabled()).toBe(false);
  });
});
