import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkSignature, MetaConfig } from "../src/channels/meta.js";

/**
 * A assinatura do webhook é a ÚNICA prova de que o evento veio mesmo da Meta —
 * a rota é pública e sem autenticação. Um bug aqui deixa qualquer um injetar
 * mensagens na caixa de entrada de um cliente, ou derruba a integração inteira
 * recusando eventos legítimos.
 */

const SEGREDO = "segredo-do-app";
const assinar = (corpo: string, segredo = SEGREDO) =>
  "sha256=" + createHmac("sha256", segredo).update(corpo, "utf8").digest("hex");

describe("checkSignature", () => {
  const corpo = JSON.stringify({ object: "page", entry: [{ id: "123" }] });

  it("aceita a assinatura correta", () => {
    expect(checkSignature(corpo, assinar(corpo), SEGREDO)).toBe(true);
  });

  it("recusa assinatura gerada com outro segredo", () => {
    expect(checkSignature(corpo, assinar(corpo, "outro-segredo"), SEGREDO)).toBe(false);
  });

  it("recusa quando o corpo mudou, mesmo com assinatura bem formada", () => {
    const adulterado = JSON.stringify({ object: "page", entry: [{ id: "999" }] });
    expect(checkSignature(adulterado, assinar(corpo), SEGREDO)).toBe(false);
  });

  it("recusa cabeçalho ausente ou sem o prefixo sha256=", () => {
    expect(checkSignature(corpo, undefined, SEGREDO)).toBe(false);
    expect(checkSignature(corpo, "sha1=abc", SEGREDO)).toBe(false);
    expect(
      checkSignature(corpo, createHmac("sha256", SEGREDO).update(corpo).digest("hex"), SEGREDO)
    ).toBe(false);
  });

  it("recusa hex inválido sem estourar exceção", () => {
    expect(checkSignature(corpo, "sha256=nao-e-hex", SEGREDO)).toBe(false);
    expect(checkSignature(corpo, "sha256=", SEGREDO)).toBe(false);
  });

  it("recusa assinatura de tamanho diferente (evita timingSafeEqual lançar)", () => {
    expect(checkSignature(corpo, "sha256=abcd", SEGREDO)).toBe(false);
  });

  // Reserializar o JSON muda espaços e ordem de chaves — este é o erro clássico
  // de integração com a Meta, e o motivo de guardarmos o corpo cru no parser.
  it("falha quando o corpo é reserializado em vez de usado cru", () => {
    const cru = '{"object":"page",  "entry":[]}';
    const reserializado = JSON.stringify(JSON.parse(cru));
    expect(checkSignature(reserializado, assinar(cru), SEGREDO)).toBe(false);
    expect(checkSignature(cru, assinar(cru), SEGREDO)).toBe(true);
  });
});

describe("MetaConfig", () => {
  const completo = {
    pageId: "1234567890",
    pageAccessToken: "EAA-token-da-pagina",
  };

  it("aceita só o que é da página (app vem do ambiente)", () => {
    expect(MetaConfig.parse(completo)).toMatchObject(completo);
  });

  it("aceita sobrescrita do app por conexão", () => {
    const cfg = MetaConfig.parse({ ...completo, appSecret: "s", verifyToken: "v" });
    expect(cfg.appSecret).toBe("s");
    expect(cfg.verifyToken).toBe("v");
  });

  it("cobra o id da página com mensagem em português", () => {
    const r = MetaConfig.safeParse({ pageAccessToken: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/ID da página/i);
  });

  it("cobra o token da página", () => {
    const r = MetaConfig.safeParse({ pageId: "1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/token de acesso/i);
  });

  it("rejeita string vazia como se fosse ausente", () => {
    expect(MetaConfig.safeParse({ pageId: "", pageAccessToken: "x" }).success).toBe(false);
  });
});
