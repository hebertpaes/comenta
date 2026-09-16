import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hasTestDatabase, pushSchema, seedPlans, truncateAll } from "./helpers/db.js";
import { buildTestServer, signupCompany } from "./helpers/server.js";

/**
 * Isolamento entre empresas (multi-tenant).
 *
 * Este é o teste mais importante da API: toda a segurança do produto depende
 * de cada query carregar o `where companyId`. Um esquecimento não quebra nada
 * visivelmente — só vaza dado de um cliente para outro, em silêncio.
 *
 * Roda contra um Postgres real, porque é exatamente o comportamento das
 * queries que está sendo verificado.
 */

const run = hasTestDatabase ? describe : describe.skip;

if (!hasTestDatabase) {
  console.warn(
    "\n[multi-tenant] PULADO: defina TEST_DATABASE_URL para rodar.\n" +
      "  docker compose -f test/docker-compose.test.yml up -d\n" +
      "  TEST_DATABASE_URL=postgresql://comenta:comenta@localhost:55432/comenta_test npm test -w @comenta/api\n"
  );
}

run("isolamento entre empresas", () => {
  let app: FastifyInstance;
  let sql: typeof import("../src/db/client.js").sql;

  beforeAll(async () => {
    pushSchema();
    // O client lê DATABASE_URL no import, então o setup do Vitest já apontou a
    // variável para o banco de teste antes daqui.
    ({ sql } = await import("../src/db/client.js"));
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
    await sql.end();
  });

  beforeEach(async () => {
    await truncateAll(sql);
    await seedPlans(sql);
  });

  it("não deixa uma empresa ver os contatos da outra", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });
    const globex = await signupCompany(app, {
      companyName: "Globex",
      name: "Bruno",
      email: "bruno@globex.test",
    });

    await app.inject({
      method: "POST",
      url: "/contacts",
      headers: acme.auth,
      payload: { name: "Cliente da Acme", phone: "11999990001" },
    });

    const vistoPelaGlobex = await app.inject({
      method: "GET",
      url: "/contacts",
      headers: globex.auth,
    });
    expect(vistoPelaGlobex.statusCode).toBe(200);
    expect(vistoPelaGlobex.json().data).toHaveLength(0);

    const vistoPelaAcme = await app.inject({ method: "GET", url: "/contacts", headers: acme.auth });
    expect(vistoPelaAcme.json().data).toHaveLength(1);
  });

  it("não deixa uma empresa ler um contato da outra pelo id", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });
    const globex = await signupCompany(app, {
      companyName: "Globex",
      name: "Bruno",
      email: "bruno@globex.test",
    });

    const criado = await app.inject({
      method: "POST",
      url: "/contacts",
      headers: acme.auth,
      payload: { name: "Cliente da Acme", phone: "11999990002" },
    });
    const contatoId = criado.json().id;

    // Conhecer o id não pode bastar: a query precisa filtrar pela empresa.
    const alheio = await app.inject({
      method: "PATCH",
      url: `/contacts/${contatoId}`,
      headers: globex.auth,
      payload: { name: "Sequestrado" },
    });
    expect(alheio.statusCode).toBe(404);

    const conferindo = await app.inject({ method: "GET", url: "/contacts", headers: acme.auth });
    expect(conferindo.json().data[0].name).toBe("Cliente da Acme");
  });

  it("não deixa uma empresa apagar contato da outra", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });
    const globex = await signupCompany(app, {
      companyName: "Globex",
      name: "Bruno",
      email: "bruno@globex.test",
    });

    const criado = await app.inject({
      method: "POST",
      url: "/contacts",
      headers: acme.auth,
      payload: { name: "Cliente da Acme", phone: "11999990003" },
    });

    const apagar = await app.inject({
      method: "DELETE",
      url: `/contacts/${criado.json().id}`,
      headers: globex.auth,
    });
    expect(apagar.statusCode).toBe(404);

    const restou = await app.inject({ method: "GET", url: "/contacts", headers: acme.auth });
    expect(restou.json().data).toHaveLength(1);
  });

  it("não deixa uma empresa ver os usuários da outra", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });
    const globex = await signupCompany(app, {
      companyName: "Globex",
      name: "Bruno",
      email: "bruno@globex.test",
    });

    const daAcme = await app.inject({ method: "GET", url: "/users", headers: acme.auth });
    const daGlobex = await app.inject({ method: "GET", url: "/users", headers: globex.auth });

    expect(daAcme.json().data.map((u: { email: string }) => u.email)).toEqual(["ana@acme.test"]);
    expect(daGlobex.json().data.map((u: { email: string }) => u.email)).toEqual([
      "bruno@globex.test",
    ]);
  });

  it("não deixa uma empresa ver as filas da outra", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });
    const globex = await signupCompany(app, {
      companyName: "Globex",
      name: "Bruno",
      email: "bruno@globex.test",
    });

    await app.inject({
      method: "POST",
      url: "/queues",
      headers: acme.auth,
      payload: { name: "Suporte Acme" },
    });

    expect(
      (await app.inject({ method: "GET", url: "/queues", headers: globex.auth })).json().data
    ).toHaveLength(0);
    expect(
      (await app.inject({ method: "GET", url: "/queues", headers: acme.auth })).json().data
    ).toHaveLength(1);
  });

  it("não deixa uma empresa apagar fila da outra", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });
    const globex = await signupCompany(app, {
      companyName: "Globex",
      name: "Bruno",
      email: "bruno@globex.test",
    });

    const fila = await app.inject({
      method: "POST",
      url: "/queues",
      headers: acme.auth,
      payload: { name: "Suporte Acme" },
    });

    const apagar = await app.inject({
      method: "DELETE",
      url: `/queues/${fila.json().id}`,
      headers: globex.auth,
    });
    expect(apagar.statusCode).toBe(404);
  });

  it("/auth/me devolve a empresa de quem chamou, não a primeira do banco", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });
    const globex = await signupCompany(app, {
      companyName: "Globex",
      name: "Bruno",
      email: "bruno@globex.test",
    });

    expect(
      (await app.inject({ method: "GET", url: "/auth/me", headers: acme.auth })).json().company.name
    ).toBe("Acme");
    expect(
      (await app.inject({ method: "GET", url: "/auth/me", headers: globex.auth })).json().company
        .name
    ).toBe("Globex");
  });
});
