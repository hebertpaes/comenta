import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hasTestDatabase, pushSchema, seedPlans, truncateAll } from "./helpers/db.js";
import { buildTestServer, signupCompany } from "./helpers/server.js";

/**
 * Regra de autoatendimento por IA (`type: "ai"`) numa instalação **sem**
 * `ANTHROPIC_API_KEY`.
 *
 * O handoff — cliente pede um atendente humano — é só comparação de texto e
 * não fala com a Anthropic. Já houve uma versão em que a checagem da chave
 * vinha antes dessa comparação: sem chave, a regra ficava completamente muda,
 * o cliente pedia uma pessoa e não recebia nada, e a conversa nunca entrava na
 * fila. Como a falha é silenciosa (a automação engole os próprios erros para
 * não derrubar as outras regras), ninguém percebia.
 *
 * Roda contra um Postgres real: o que se verifica é o efeito no banco.
 */

// `queues.ts` abre uma conexão Redis no import e nada aqui depende de webhooks.
vi.mock("../src/queues.js", () => ({
  publishEvent: async () => {},
  redis: {},
}));

// A entrega no WhatsApp é um import dinâmico dentro do botReply e já tolera
// falha; mockar evita que o teste dependa do estado do canal.
vi.mock("../src/channels/whatsapp.js", () => ({
  sendToContact: async () => {},
}));

const run = hasTestDatabase ? describe : describe.skip;

if (!hasTestDatabase) {
  console.warn(
    "\n[automations] PULADO: defina TEST_DATABASE_URL para rodar.\n" +
      "  docker compose -f test/docker-compose.test.yml up -d\n" +
      "  TEST_DATABASE_URL=postgresql://comenta:comenta@localhost:55432/comenta_test npm test -w @comenta/api\n"
  );
}

run("autoatendimento por IA sem ANTHROPIC_API_KEY", () => {
  let app: FastifyInstance;
  let sql: typeof import("../src/db/client.js").sql;
  let db: typeof import("../src/db/client.js").db;
  let schema: typeof import("../src/db/client.js").schema;
  let applyAutomations: typeof import("../src/modules/automations.js").applyAutomations;
  let chaveOriginal: string | undefined;

  const HANDOFF = "Certo! Vou te transferir para um atendente humano.";

  beforeAll(async () => {
    pushSchema();
    ({ sql, db, schema } = await import("../src/db/client.js"));
    ({ applyAutomations } = await import("../src/modules/automations.js"));
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
    await sql.end();
  });

  beforeEach(async () => {
    chaveOriginal = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    await truncateAll(sql);
    await seedPlans(sql);
  });

  afterEach(() => {
    if (chaveOriginal === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = chaveOriginal;
  });

  /** Empresa com uma conversa aberta no bot e a regra de IA ativa. */
  async function cenario() {
    const empresa = await signupCompany(app, {
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.test",
    });
    const companyId = empresa.companyId;

    const [contact] = await db
      .insert(schema.contacts)
      .values({ companyId, name: "Cliente", phone: "5566988887777" })
      .returning();
    const [conversation] = await db
      .insert(schema.conversations)
      .values({ companyId, contactId: contact.id, status: "open", botActive: true })
      .returning();
    await db.insert(schema.automations).values({
      companyId,
      name: "Autoatendimento IA",
      type: "ai",
      isActive: true,
      config: { knowledge: "A Acme vende parafusos.", handoffMessage: HANDOFF },
    });

    return { companyId, conv: { id: conversation.id, contactId: contact.id } };
  }

  it("transfere para um humano quando o cliente pede, mesmo sem chave", async () => {
    const { companyId, conv } = await cenario();

    await applyAutomations(companyId, conv, "quero falar com um atendente, por favor", false);

    const enviadas = await db
      .select({ body: schema.messages.body, direction: schema.messages.direction })
      .from(schema.messages);
    expect(enviadas.map((m) => m.direction)).toEqual(["out"]);
    expect(enviadas[0].body).toContain("atendente humano");

    const [depois] = await db.select().from(schema.conversations);
    expect(depois.botActive).toBe(false);
    expect(depois.status).toBe("pending");
  });

  it("usa a mensagem de handoff configurada na regra", async () => {
    const { companyId, conv } = await cenario();

    await applyAutomations(companyId, conv, "prefiro falar com uma pessoa", false);

    const [msg] = await db.select({ body: schema.messages.body }).from(schema.messages);
    expect(msg.body).toBe(HANDOFF);
  });

  it("fica calada numa mensagem comum — sem chave não há resposta da IA", async () => {
    const { companyId, conv } = await cenario();

    await applyAutomations(companyId, conv, "vocês entregam em Cuiabá?", false);

    const enviadas = await db.select().from(schema.messages);
    expect(enviadas).toHaveLength(0);

    // A conversa continua com o bot ligado: nada aconteceu, nada mudou.
    const [depois] = await db.select().from(schema.conversations);
    expect(depois.botActive).toBe(true);
    expect(depois.status).toBe("open");
  });

  it("não intromete numa conversa já assumida por um humano", async () => {
    const empresa = await signupCompany(app, {
      companyName: "Globex",
      name: "Bruno",
      email: "bruno@globex.test",
    });
    const companyId = empresa.companyId;
    const [contact] = await db
      .insert(schema.contacts)
      .values({ companyId, name: "Cliente", phone: "5566977776666" })
      .returning();
    const [conversation] = await db
      .insert(schema.conversations)
      .values({
        companyId,
        contactId: contact.id,
        status: "open",
        botActive: true,
        assignedUserId: empresa.userId,
      })
      .returning();
    await db.insert(schema.automations).values({
      companyId,
      name: "Autoatendimento IA",
      type: "ai",
      isActive: true,
      config: { handoffMessage: HANDOFF },
    });

    await applyAutomations(
      companyId,
      { id: conversation.id, contactId: contact.id },
      "quero falar com um atendente",
      false
    );

    const enviadas = await db.select().from(schema.messages);
    expect(enviadas).toHaveLength(0);
  });
});
