import { describe, expect, it } from "vitest";
import { isOpenNow } from "../src/lib/schedule.js";

/**
 * `isOpenNow` decide se o bot responde "estamos fechados". Erro aqui manda
 * mensagem de fora do horário para cliente que escreveu em pleno expediente,
 * ou deixa de mandar de madrugada.
 *
 * A função usa o fuso local do processo (getDay/getHours), então os `new Date`
 * abaixo também são locais — é a mesma referência.
 */

// 2026-07-22 é uma quarta-feira.
const wednesdayAt = (h: number, m = 0) => new Date(2026, 6, 22, h, m);
const sundayAt = (h: number, m = 0) => new Date(2026, 6, 26, h, m);

const comercial = {
  enabled: true,
  days: [1, 2, 3, 4, 5],
  start: "09:00",
  end: "18:00",
};

describe("isOpenNow", () => {
  it("considera sempre aberto quando a agenda não está habilitada", () => {
    expect(isOpenNow(null, sundayAt(3))).toBe(true);
    expect(isOpenNow(undefined, sundayAt(3))).toBe(true);
    expect(
      isOpenNow({ enabled: false, days: [1], start: "09:00", end: "10:00" }, sundayAt(3))
    ).toBe(true);
  });

  it("abre dentro do horário em dia útil", () => {
    expect(isOpenNow(comercial, wednesdayAt(9, 0))).toBe(true);
    expect(isOpenNow(comercial, wednesdayAt(13, 30))).toBe(true);
    expect(isOpenNow(comercial, wednesdayAt(17, 59))).toBe(true);
  });

  it("fecha fora do horário no mesmo dia útil", () => {
    expect(isOpenNow(comercial, wednesdayAt(8, 59))).toBe(false);
    expect(isOpenNow(comercial, wednesdayAt(23, 0))).toBe(false);
  });

  it("trata o horário de abertura como inclusivo e o de fechamento como exclusivo", () => {
    // Às 18:00 em ponto já está fechado — senão o último minuto do expediente
    // ficaria ambíguo entre aberto e fechado.
    expect(isOpenNow(comercial, wednesdayAt(18, 0))).toBe(false);
    expect(isOpenNow(comercial, wednesdayAt(9, 0))).toBe(true);
  });

  it("fecha em dia que não está na lista", () => {
    expect(isOpenNow(comercial, sundayAt(13))).toBe(false);
  });

  it("usa segunda a sexta quando a lista de dias vem vazia", () => {
    const semDias = { ...comercial, days: [] };
    expect(isOpenNow(semDias, wednesdayAt(13))).toBe(true);
    expect(isOpenNow(semDias, sundayAt(13))).toBe(false);
  });

  it("usa 09:00–18:00 quando os horários não vêm preenchidos", () => {
    const semHoras = { enabled: true, days: [1, 2, 3, 4, 5] };
    expect(isOpenNow(semHoras, wednesdayAt(10))).toBe(true);
    expect(isOpenNow(semHoras, wednesdayAt(20))).toBe(false);
  });

  it("mapeia domingo para 7, não para 0", () => {
    // getDay() devolve 0 no domingo; a agenda usa 1..7. Se o mapeamento
    // quebrar, um horário que inclui domingo passaria a nunca abrir.
    expect(isOpenNow({ enabled: true, days: [7], start: "08:00", end: "12:00" }, sundayAt(9))).toBe(
      true
    );
  });
});
