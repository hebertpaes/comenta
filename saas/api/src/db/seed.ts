import { eq } from "drizzle-orm";
import { db, schema, sql } from "./client.js";
import { hashPassword } from "../lib/auth.js";

/** Popula planos e uma empresa/admin de demonstração. Idempotente. */
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
  if (!existing) {
    const [company] = await db
      .insert(schema.companies)
      .values({ name: "Comenta Demo", slug: "comenta-demo", planId: "business" })
      .returning();
    await db.insert(schema.users).values({
      companyId: company.id,
      name: "Administrador",
      email,
      passwordHash: await hashPassword("comenta123"),
      role: "admin",
    });
    console.log(`✓ empresa "Comenta Demo" + admin ${email} / comenta123`);
  } else {
    console.log(`• admin ${email} já existe`);
  }
  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
