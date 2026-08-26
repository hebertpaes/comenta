import { eq } from "drizzle-orm";
import { db, schema, sql } from "./client.js";
import { hashPassword } from "../lib/auth.js";

async function resetAdminCredentials() {
  const adminEmail = process.env.RESET_EMAIL || "admin@comenta.com.br";
  const newPassword = process.env.RESET_PASSWORD || "comenta123";

  console.log(`🔑 Redefinindo credenciais para o e-mail: ${adminEmail}...`);

  const passwordHash = await hashPassword(newPassword);

  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail));

  if (existingUser) {
    await db
      .update(schema.users)
      .set({
        passwordHash,
        mustChangePassword: false,
      })
      .where(eq(schema.users.id, existingUser.id));

    console.log(`✅ Senha do usuário ${adminEmail} redefinida com sucesso para "${newPassword}"!`);
  } else {
    // Busca ou cria empresa demo
    let [company] = await db.select().from(schema.companies).limit(1);
    if (!company) {
      [company] = await db
        .insert(schema.companies)
        .values({ name: "Comenta Demo", slug: "comenta-demo", planId: "business" })
        .returning();
    }

    await db.insert(schema.users).values({
      companyId: company.id,
      name: "Administrador",
      email: adminEmail,
      passwordHash,
      role: "admin",
      mustChangePassword: false,
    });

    console.log(`✅ Conta Admin ${adminEmail} criada com sucesso com a senha "${newPassword}"!`);
  }

  // Lista todos os usuários cadastrados
  const allUsers = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role, name: schema.users.name })
    .from(schema.users);

  console.log("\n📋 Usuários disponíveis para Login:");
  allUsers.forEach((u) => {
    console.log(` • E-mail: ${u.email} | Função: ${u.role} | Nome: ${u.name}`);
  });

  await sql.end();
}

resetAdminCredentials().catch((err) => {
  console.error("❌ Erro ao redefinir credenciais:", err);
  process.exit(1);
});
