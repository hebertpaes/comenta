import { and, eq } from "drizzle-orm";
import { db, schema, sql } from "./client.js";
import { hashPassword } from "../lib/auth.js";

/** Popula planos, empresa/admin de demonstração e atendentes. Idempotente. */
async function seed() {
  const plans = [
    { id: "free", name: "Free", priceCents: 0, maxUsers: 3, maxChannels: 1, maxContacts: 500, maxMonthlyMessages: 1000, features: ["multicanal", "ia_basica"] },
    { id: "pro", name: "Pro", priceCents: 9900, maxUsers: 15, maxChannels: 5, maxContacts: 10000, maxMonthlyMessages: 50000, features: ["multicanal", "ia_avancada", "api", "webhooks"] },
    { id: "business", name: "Business", priceCents: 29900, maxUsers: 100, maxChannels: 20, maxContacts: 200000, maxMonthlyMessages: 1000000, features: ["multicanal", "ia_avancada", "api", "webhooks", "sla", "sso"] },
  ];
  for (const p of plans) {
    await db.insert(schema.plans).values(p).onConflictDoUpdate({ target: schema.plans.id, set: p });
  }
  console.log(`✓ ${plans.length} planos`);

  const email = "admin@comenta.com.br";
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  let companyId: string;
  if (!existing) {
    const [company] = await db
      .insert(schema.companies)
      .values({ name: "Comenta Demo", slug: "comenta-demo", planId: "business" })
      .returning();
    companyId = company.id;
    await db.insert(schema.users).values({
      companyId,
      name: "Administrador",
      email,
      passwordHash: await hashPassword("comenta123"),
      role: "admin",
    });
    console.log(`✓ empresa "Comenta Demo" + admin ${email} / comenta123`);
  } else {
    companyId = existing.companyId;
    console.log(`• admin ${email} já existe`);
  }

  // Atendentes (agents) por time — atendem e recebem transferências no painel.
  // Idempotente: cria apenas os que faltam (por e-mail).
  const agents = [
    { nome: "Camila", time: "Suporte" },
    { nome: "Diego", time: "Suporte" },
    { nome: "Priscila", time: "Vendas" },
    { nome: "Marcos", time: "Vendas" },
    { nome: "Rafaela", time: "Financeiro" },
    { nome: "Letícia", time: "Marketing" },
    { nome: "Bruno", time: "Marketing" },
  ];
  const agentHash = await hashPassword("agente123");
  let novos = 0;
  for (const a of agents) {
    const login = a.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const res = await db
      .insert(schema.users)
      .values({ companyId, name: `${a.nome} · ${a.time}`, email: `${login}@comenta.com.br`, passwordHash: agentHash, role: "agent" })
      .onConflictDoNothing({ target: schema.users.email })
      .returning();
    if (res.length) novos++;
  }
  console.log(`✓ atendentes: ${novos} novos / ${agents.length} no total (senha agente123)`);

  // Academia Comenta (Fase 6): cursos de treinamento iniciais. Idempotente
  // por título+empresa: só cria o que faltar, com suas aulas.
  const starterCourses = [
    {
      title: "Comece pelo Comenta",
      emoji: "🚀",
      level: "iniciante",
      position: 1,
      description: "Do zero ao primeiro atendimento: painel, conversas e times.",
      lessons: [
        { title: "Visão geral da plataforma", durationMin: 6, content: "Conheça o painel: Dashboard, Conversas, Automações, Ferramentas e Conexões.", videoUrl: "" },
        { title: "Atendendo no painel", durationMin: 8, content: "Como pegar uma conversa da fila, responder e resolver. Uso da IA (classificar, resumir, sugerir).", videoUrl: "" },
        { title: "Times e roteamento", durationMin: 5, content: "Como as conversas chegam por time (Suporte, Vendas, Financeiro, Marketing).", videoUrl: "" },
      ],
    },
    {
      title: "WhatsApp e canais",
      emoji: "📲",
      level: "iniciante",
      position: 2,
      description: "Conecte o WhatsApp Business por QR e atenda o cliente no canal dele.",
      lessons: [
        { title: "Conectar o WhatsApp (QR)", durationMin: 5, content: "Aba Conexões → Conectar WhatsApp → leia o QR no celular da empresa.", videoUrl: "" },
        { title: "Fluxo site + WhatsApp", durationMin: 6, content: "O atendimento iniciado no site também chega ao WhatsApp do cliente.", videoUrl: "" },
      ],
    },
    {
      title: "Automação e bot de fluxo",
      emoji: "🤖",
      level: "intermediario",
      position: 3,
      description: "Respostas automáticas (boas-vindas, fora do horário, palavra-chave).",
      lessons: [
        { title: "Criando regras na aba Automações", durationMin: 7, content: "Boas-vindas, fora do horário e palavra-chave — criar, pausar e remover.", videoUrl: "" },
        { title: "Boas práticas de bot", durationMin: 6, content: "Quando responder automático e quando transferir para humano.", videoUrl: "" },
      ],
    },
    {
      title: "Ferramentas open-source",
      emoji: "🧩",
      level: "avancado",
      position: 4,
      description: "n8n (automação), Metabase (BI) e NocoDB (no-code) integrados ao Comenta.",
      lessons: [
        { title: "n8n: automações por webhook", durationMin: 10, content: "Ligar o n8n, criar um webhook e reagir aos eventos do Comenta.", videoUrl: "" },
        { title: "Metabase: relatórios", durationMin: 9, content: "Conectar no Postgres e montar dashboards de atendimento.", videoUrl: "" },
        { title: "NocoDB: base no-code", durationMin: 7, content: "Montar um mini-CRM e alimentar o n8n.", videoUrl: "" },
      ],
    },
  ];
  let novosCursos = 0;
  for (const c of starterCourses) {
    const [exists] = await db
      .select({ id: schema.courses.id })
      .from(schema.courses)
      .where(and(eq(schema.courses.companyId, companyId), eq(schema.courses.title, c.title)));
    if (exists) continue;
    const [course] = await db
      .insert(schema.courses)
      .values({ companyId, title: c.title, description: c.description, emoji: c.emoji, level: c.level, position: c.position })
      .returning();
    await db.insert(schema.lessons).values(
      c.lessons.map((l, i) => ({ courseId: course.id, title: l.title, content: l.content, videoUrl: l.videoUrl, durationMin: l.durationMin, position: i + 1 }))
    );
    novosCursos++;
  }
  console.log(`✓ cursos (Academia): ${novosCursos} novos / ${starterCourses.length} no total`);

  // Conexões iniciais (multicanal): cria WhatsApp + Widget se a empresa não
  // tiver nenhuma conexão ainda. Idempotente.
  const existingChannels = await db
    .select({ id: schema.channels.id })
    .from(schema.channels)
    .where(eq(schema.channels.companyId, companyId));
  if (existingChannels.length === 0) {
    await db.insert(schema.channels).values([
      { companyId, type: "whatsapp", name: "WhatsApp Business", status: "disconnected" },
      { companyId, type: "widget", name: "Widget do site", status: "connected" },
    ]);
    console.log("✓ conexões iniciais: WhatsApp + Widget");
  }

  // Filas / Departamentos (Fase 8): cria as 4 filas padrão e liga cada
  // atendente à fila do seu time. Idempotente por nome de fila.
  const defaultQueues = [
    { name: "Suporte", color: "#2563eb", orderIndex: 1 },
    { name: "Vendas", color: "#16a34a", orderIndex: 2 },
    { name: "Financeiro", color: "#d97706", orderIndex: 3 },
    { name: "Marketing", color: "#db2777", orderIndex: 4 },
  ];
  const companyUsers = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.companyId, companyId));
  let novasFilas = 0;
  for (const q of defaultQueues) {
    let [queue] = await db
      .select()
      .from(schema.queues)
      .where(and(eq(schema.queues.companyId, companyId), eq(schema.queues.name, q.name)));
    if (!queue) {
      [queue] = await db.insert(schema.queues).values({ companyId, ...q }).returning();
      novasFilas++;
    }
    // membros: atendentes cujo nome traz o time (ex.: "Camila · Suporte")
    const memberIds = companyUsers.filter((u) => u.name.includes(q.name)).map((u) => u.id);
    for (const userId of memberIds) {
      await db
        .insert(schema.userQueues)
        .values({ companyId, queueId: queue.id, userId })
        .onConflictDoNothing();
    }
  }
  console.log(`✓ filas: ${novasFilas} novas / ${defaultQueues.length} no total`);

  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
