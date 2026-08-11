import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, paginated, parse } from "../src/lib/http.js";

describe("parse", () => {
  it("devolve o valor já convertido pelo schema", () => {
    const Schema = z.object({ page: z.coerce.number(), nome: z.string() });
    expect(parse(Schema, { page: "3", nome: "ana" })).toEqual({ page: 3, nome: "ana" });
  });

  it("transforma erro de validação em ApiError 400 com o campo que falhou", () => {
    const Schema = z.object({ email: z.string().email() });
    try {
      parse(Schema, { email: "não-é-email" });
      expect.unreachable("parse deveria ter lançado");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe("validation");
      // A mensagem precisa dizer QUAL campo falhou; só "dados inválidos" não
      // ajuda quem está integrando com a API.
      expect(err.message).toContain("email");
    }
  });

  it("lista todos os campos inválidos, não só o primeiro", () => {
    const Schema = z.object({ email: z.string().email(), idade: z.number() });
    try {
      parse(Schema, { email: "x", idade: "abc" });
      expect.unreachable("parse deveria ter lançado");
    } catch (e) {
      expect((e as ApiError).message).toContain("email");
      expect((e as ApiError).message).toContain("idade");
    }
  });
});

describe("paginated", () => {
  it("calcula o offset a partir da página", () => {
    expect(paginated(1, 20)).toEqual({ limit: 20, offset: 0 });
    expect(paginated(3, 20)).toEqual({ limit: 20, offset: 40 });
  });

  it("limita perPage a 100 para um cliente não pedir a tabela inteira", () => {
    expect(paginated(1, 5000).limit).toBe(100);
  });

  it("trata página e perPage abaixo de 1 sem gerar offset negativo", () => {
    expect(paginated(0, 20).offset).toBe(0);
    expect(paginated(-5, 20).offset).toBe(0);
    expect(paginated(1, 0).limit).toBe(1);
  });
});
