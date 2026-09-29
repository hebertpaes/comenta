/**
 * Protocolo de segurança (29/09/2026): os webhooks de venda (Hotmart e ABACS)
 * só aceitam quem mandar o segredo configurado no ambiente, e as rotas que
 * leem ou gravam credenciais de pagamento exigem administrador autenticado.
 *
 * Roda sem banco: o cliente do Drizzle, o realtime, as filas e o WhatsApp são
 * substituídos por dublês, e nenhum teste chega a gravar nada.
 */
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  empresa: null as null | { id: string; settings: Record<string, unknown> },
  gravou: vi.fn(),
}));

vi.mock("../src/db/client.js", () => {
  const consulta = () => {
    const q: any = {
      from: () => q,
      where: () => q,
      limit: () => Promise.resolve(estado.empresa ? [estado.empresa] : []),
      then: (ok: any, erro: any) => Promise.resolve([]).then(ok, erro),
    };
    return q;
  };
  const alteracao = () => {
    estado.gravou();
    const q: any = { set: () => q, values: () => q, where: () => Promise.resolve([]), returning: () => Promise.resolve([]) };
    return q;
  };
  return {
    db: { select: consulta, update: alteracao, insert: alteracao },
    schema: new Proxy({}, { get: () => new Proxy({}, { get: () => ({}) }) }),
    sql: {},
  };
});
vi.mock("../src/realtime.js", () => ({ emitToCompany: vi.fn() }));
vi.mock("../src/queues.js", () => ({ publishEvent: vi.fn(() => Promise.resolve()) }));
vi.mock("../src/channels/whatsapp.js", () => ({ sendToContact: vi.fn(() => Promise.resolve()) }));

async function montar(modulo: "hotmart" | "abacs"): Promise<FastifyInstance> {
  vi.resetModules();
  const app = Fastify();
  if (modulo === "hotmart") {
    const { hotmartRoutes } = await import("../src/modules/hotmart.js");
    await app.register(hotmartRoutes);
  } else {
    const { abacsRoutes } = await import("../src/modules/abacs.js");
    await app.register(abacsRoutes);
  }
  await app.ready();
  return app;
}

async function tokenDe(role: "admin" | "agent") {
  const { signAccessToken } = await import("../src/lib/auth.js");
  return signAccessToken({ userId: "u1", companyId: "c1", role, name: "Teste" });
}

const compra = { event: "PURCHASE_APPROVED", data: { buyer: { name: "Fulano" } } };

beforeEach(() => {
  estado.empresa = null;
  estado.gravou.mockClear();
});
afterEach(() => {
  delete process.env.HOTMART_HOTTOK;
  delete process.env.ABACS_TOKEN;
});

describe("webhook Hotmart", () => {
  it("fica fechado (503) quando HOTMART_HOTTOK não está configurado", async () => {
    const app = await montar("hotmart");
    const r = await app.inject({ method: "POST", url: "/webhooks/hotmart", payload: compra });
    expect(r.statusCode).toBe(503);
  });

  it("recusa (401) chamada sem hottok ou com hottok errado", async () => {
    process.env.HOTMART_HOTTOK = "hottok-de-teste-123";
    const app = await montar("hotmart");
    for (const extra of [{}, { hottok: "errado" }, { hottok: "hottok-de-teste-12" }]) {
      const r = await app.inject({ method: "POST", url: "/webhooks/hotmart", payload: { ...compra, ...extra } });
      expect(r.statusCode).toBe(401);
      expect(r.body).not.toContain("hottok-de-teste-123");
    }
    expect(estado.gravou).not.toHaveBeenCalled();
  });

  it("aceita o hottok certo pelo cabeçalho X-HOTMART-HOTTOK", async () => {
    process.env.HOTMART_HOTTOK = "hottok-de-teste-123";
    const app = await montar("hotmart");
    const r = await app.inject({
      method: "POST",
      url: "/webhooks/hotmart",
      headers: { "x-hotmart-hottok": "hottok-de-teste-123" },
      payload: compra,
    });
    // Passou da verificação; sem empresa no banco de mentira, para no 404.
    expect(r.statusCode).toBe(404);
  });

  it("rota de teste exige administrador", async () => {
    process.env.HOTMART_HOTTOK = "hottok-de-teste-123";
    const app = await montar("hotmart");
    const semLogin = await app.inject({ method: "POST", url: "/webhooks/hotmart/test" });
    expect(semLogin.statusCode).toBe(401);
    const atendente = await app.inject({
      method: "POST",
      url: "/webhooks/hotmart/test",
      headers: { authorization: `Bearer ${await tokenDe("agent")}` },
    });
    expect(atendente.statusCode).toBe(403);
  });
});

describe("integração ABACS", () => {
  it("webhook fica fechado (503) sem token configurado", async () => {
    estado.empresa = { id: "c1", settings: {} };
    const app = await montar("abacs");
    const r = await app.inject({ method: "GET", url: "/integracao/hotmart/hotmart.php?token=qualquer&curso=77" });
    expect(r.statusCode).toBe(503);
  });

  it("webhook recusa (401) token errado e não devolve o token certo", async () => {
    estado.empresa = { id: "c1", settings: { abacsToken: "token-abacs-certo-9876" } };
    const app = await montar("abacs");
    for (const url of [
      "/integracao/hotmart/hotmart.php?curso=77",
      "/integracao/hotmart/hotmart.php?token=errado&curso=77",
      "/webhooks/abacs/integracao/hotmart?token=token-abacs-certo-987",
    ]) {
      const r = await app.inject({ method: "GET", url });
      expect(r.statusCode).toBe(401);
      expect(r.body).not.toContain("token-abacs-certo-9876");
    }
    expect(estado.gravou).not.toHaveBeenCalled();
  });

  it("ABACS_TOKEN do ambiente vale mais que o salvo no painel", async () => {
    process.env.ABACS_TOKEN = "token-do-ambiente-5555";
    estado.empresa = { id: "c1", settings: { abacsToken: "token-antigo-do-painel" } };
    const app = await montar("abacs");
    const antigo = await app.inject({ method: "GET", url: "/integracao/hotmart/hotmart.php?token=token-antigo-do-painel" });
    expect(antigo.statusCode).toBe(401);
  });

  it("credenciais de pagamento: leitura, gravação e sincronismo exigem login", async () => {
    estado.empresa = { id: "c1", settings: { abacsToken: "token-abacs-certo-9876" } };
    const app = await montar("abacs");
    for (const [method, url] of [
      ["GET", "/abacs/config"],
      ["POST", "/abacs/config"],
      ["POST", "/abacs/sync-hotmart"],
    ] as const) {
      const r = await app.inject({ method, url, payload: method === "POST" ? { abacsToken: "invasor" } : undefined });
      expect(r.statusCode).toBe(401);
    }
    const atendente = await app.inject({
      method: "POST",
      url: "/abacs/config",
      headers: { authorization: `Bearer ${await tokenDe("agent")}` },
      payload: { abacsToken: "invasor" },
    });
    expect(atendente.statusCode).toBe(403);
    expect(estado.gravou).not.toHaveBeenCalled();
  });

  it("administrador vê as credenciais só mascaradas", async () => {
    estado.empresa = {
      id: "c1",
      settings: { abacsToken: "token-abacs-certo-9876", paymentApiKey: "chave-pagamento-secreta-4321" },
    };
    const app = await montar("abacs");
    const r = await app.inject({
      method: "GET",
      url: "/abacs/config",
      headers: { authorization: `Bearer ${await tokenDe("admin")}` },
    });
    expect(r.statusCode).toBe(200);
    const corpo = r.json();
    expect(corpo.abacsTokenConfigurado).toBe(true);
    expect(corpo.abacsToken).toBe("…9876");
    expect(corpo.paymentApiKey).toBe("…4321");
    expect(r.body).not.toContain("token-abacs-certo");
    expect(r.body).not.toContain("chave-pagamento-secreta");
  });

  it("sincronismo exige usuário e senha (não é mais um repasse aberto)", async () => {
    const app = await montar("abacs");
    const r = await app.inject({
      method: "POST",
      url: "/abacs/sync-hotmart",
      headers: { authorization: `Bearer ${await tokenDe("admin")}` },
      payload: {},
    });
    expect(r.statusCode).toBe(400);
  });
});
