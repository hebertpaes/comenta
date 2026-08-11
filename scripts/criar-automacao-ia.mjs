import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://comenta:3a24efa594604b1e10d2e2b2346e5dc9@localhost:5432/comenta_saas";

console.log("=========================================================");
console.log("  🤖 AUTOMAÇÃO DE IA GOOGLE GEMINI NO ATENDECHAT");
console.log("=========================================================");

async function main() {
  const sql = postgres(DATABASE_URL);

  try {
    const companies = await sql`SELECT id, name FROM companies LIMIT 1;`;
    if (!companies.length) {
      console.log("❌ Nenhuma empresa encontrada no banco de dados.");
      await sql.end();
      return;
    }

    const companyId = companies[0].id;
    console.log(`✓ Empresa ativa: "${companies[0].name}" (${companyId})`);

    const automations = await sql`
      SELECT id, name, type, is_active FROM automations WHERE company_id = ${companyId};
    `;

    console.log(`✓ Total de Automações Ativas: ${automations.length}`);
    automations.forEach((a, i) => {
      console.log(`  ${i + 1}. [${a.type.toUpperCase()}] ${a.name} — Status: ${a.is_active ? "🟢 ATIVA" : "🔴 INATIVA"}`);
    });

    console.log("=========================================================");
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await sql.end();
  }
}

main();
