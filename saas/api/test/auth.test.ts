import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hasTestDatabase, pushSchema, seedPlans, truncateAll } from "./helpers/db.js";
import { buildTestServer, signupCompany } from "./helpers/server.js";

/** Fluxo de autenticação contra o banco real: signup, login, rotação do
 *  refresh token, logout e as permissões de administrador. */

const run = hasTestDatabase ? describe : describe.skip;

run("autenticação", () => {
  let app: FastifyInstance;
  let sql: typeof import("../src/db/client.js").sql;

  beforeAll(async () => {
    pushSchema();
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

  it("cria empresa e administrador no signup", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        companyName: "Acme",
        name: "Ana",
        email: "ana@acme.test",
        password: "senha-de-teste-123",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.role).toBe("admin");
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    // A senha não pode voltar de jeito nenhum, nem em hash.
    expect(JSON.stringify(body)).not.toContain("senha-de-teste-123");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("recusa signup com e-mail já cadastrado", async () => {
    await signupCompany(app, { companyName: "Acme", name: "Ana", email: "ana@acme.test" });

    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        companyName: "Outra",
        name: "Ana2",
        email: "ana@acme.test",
        password: "senha-de-teste-123",
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it("recusa senha curta na criação da conta", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { companyName: "Acme", name: "Ana", email: "ana@acme.test", password: "1234" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("aceita login com a senha certa e recusa com a errada", async () => {
    await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
      password: "senha-de-teste-123",
    });

    const ok = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@acme.test", password: "senha-de-teste-123" },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().accessToken).toBeTruthy();

    const nao = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@acme.test", password: "senha-errada" },
    });
    expect(nao.statusCode).toBe(401);
  });

  it("dá a mesma resposta para e-mail inexistente e senha errada", async () => {
    await signupCompany(app, { companyName: "Acme", name: "Ana", email: "ana@acme.test" });

    const senhaErrada = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@acme.test", password: "errada" },
    });
    const naoExiste = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ninguem@acme.test", password: "errada" },
    });

    // Respostas diferentes revelariam quais e-mails existem na base.
    expect(naoExiste.statusCode).toBe(senhaErrada.statusCode);
    expect(naoExiste.json().error).toBe(senhaErrada.json().error);
  });

  it("exige autenticação nas rotas protegidas", async () => {
    const semToken = await app.inject({ method: "GET", url: "/contacts" });
    expect(semToken.statusCode).toBe(401);

    const tokenInvalido = await app.inject({
      method: "GET",
      url: "/contacts",
      headers: { authorization: "Bearer isto-nao-e-um-jwt" },
    });
    expect(tokenInvalido.statusCode).toBe(401);
  });

  it("rotaciona o refresh token e invalida o anterior", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });

    const primeiro = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: acme.refreshToken },
    });
    expect(primeiro.statusCode).toBe(200);
    const novo = primeiro.json().refreshToken;
    expect(novo).not.toBe(acme.refreshToken);

    // Reusar o token antigo tem de falhar: é o que limita o estrago caso ele
    // vaze depois de já ter sido trocado.
    const reuso = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: acme.refreshToken },
    });
    expect(reuso.statusCode).toBe(401);

    const comONovo = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: novo },
    });
    expect(comONovo.statusCode).toBe(200);
  });

  it("invalida o refresh token no logout", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });

    const saida = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken: acme.refreshToken },
    });
    expect(saida.statusCode).toBe(200);

    const depois = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: acme.refreshToken },
    });
    expect(depois.statusCode).toBe(401);
  });

  it("impede atendente de criar usuário — só administrador", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });

    const criado = await app.inject({
      method: "POST",
      url: "/users",
      headers: acme.auth,
      payload: {
        name: "Carlos",
        email: "carlos@acme.test",
        password: "senha-de-teste-123",
        role: "agent",
      },
    });
    expect(criado.statusCode).toBe(201);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "carlos@acme.test", password: "senha-de-teste-123" },
    });
    const tokenDoAtendente = login.json().accessToken;

    const tentativa = await app.inject({
      method: "POST",
      url: "/users",
      headers: { authorization: `Bearer ${tokenDoAtendente}` },
      payload: {
        name: "Intruso",
        email: "intruso@acme.test",
        password: "senha-de-teste-123",
        role: "admin",
      },
    });
    expect(tentativa.statusCode).toBe(403);
  });

  it("troca de senha invalida a senha antiga", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
      password: "senha-de-teste-123",
    });

    const troca = await app.inject({
      method: "POST",
      url: "/auth/change-password",
      headers: acme.auth,
      payload: { currentPassword: "senha-de-teste-123", newPassword: "outra-senha-456" },
    });
    expect(troca.statusCode).toBe(200);

    const antiga = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@acme.test", password: "senha-de-teste-123" },
    });
    expect(antiga.statusCode).toBe(401);

    const nova = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@acme.test", password: "outra-senha-456" },
    });
    expect(nova.statusCode).toBe(200);
  });

  it("recusa troca de senha com a senha atual errada", async () => {
    const acme = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
      password: "senha-de-teste-123",
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/change-password",
      headers: acme.auth,
      payload: { currentPassword: "chute", newPassword: "outra-senha-456" },
    });
    expect(res.statusCode).toBe(401);
  });
});
