import { describe, expect, it } from "vitest";
import { ehNomeGenerico } from "../src/channels/whatsapp.js";

/**
 * Esta função decide se a sincronização da agenda pode sobrescrever o nome de
 * um contato que já existe. Errar para o lado permissivo apaga um nome que
 * alguém digitou à mão na plataforma — dado do cliente, sem desfazer.
 *
 * Os dois nomes genéricos vêm do próprio código: `recordInboundByPhone` cria
 * "Contato WhatsApp" e a sincronização cria "Contato <dígitos>".
 */

const NUM = "5566999887766";

describe("ehNomeGenerico", () => {
  it("reconhece o nome criado por mensagem recebida", () => {
    expect(ehNomeGenerico("Contato WhatsApp", NUM)).toBe(true);
  });

  it("reconhece o nome criado pela própria sincronização", () => {
    expect(ehNomeGenerico(`Contato ${NUM}`, NUM)).toBe(true);
  });

  it("protege um nome digitado por uma pessoa", () => {
    expect(ehNomeGenerico("Ana Souza", NUM)).toBe(false);
  });

  // O caso perigoso: "Contato <outro número>" não é genérico PARA ESTE
  // contato. Tratar como genérico apagaria um nome legítimo que por acaso
  // segue esse formato.
  it("não confunde o genérico de outro número", () => {
    expect(ehNomeGenerico("Contato 5511888777666", NUM)).toBe(false);
  });

  it("não trata como genérico um nome que apenas começa igual", () => {
    expect(ehNomeGenerico("Contato WhatsApp Comercial", NUM)).toBe(false);
    expect(ehNomeGenerico(`Contato ${NUM} (antigo)`, NUM)).toBe(false);
  });

  it("é sensível a caixa — nome digitado assim é de pessoa", () => {
    expect(ehNomeGenerico("contato whatsapp", NUM)).toBe(false);
  });

  it("não trata string vazia como genérica", () => {
    expect(ehNomeGenerico("", NUM)).toBe(false);
  });
});
