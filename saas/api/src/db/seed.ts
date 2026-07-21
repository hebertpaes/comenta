import { eq } from "drizzle-orm";
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

  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
