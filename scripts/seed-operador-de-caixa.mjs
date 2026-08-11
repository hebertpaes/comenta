import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://comenta:3a24efa594604b1e10d2e2b2346e5dc9@localhost:5432/comenta_saas";

console.log("=========================================================");
console.log("  🎓 CADASTRANDO CURSO 'OPERADOR DE CAIXA' (ID 77) - ABACS");
console.log("=========================================================");

async function main() {
  const sql = postgres(DATABASE_URL);

  try {
    const companies = await sql`SELECT id, name FROM companies LIMIT 1;`;
    if (!companies.length) {
      console.log("❌ Nenhuma empresa encontrada.");
      await sql.end();
      return;
    }

    const companyId = companies[0].id;
    console.log(`✓ Empresa ativa: "${companies[0].name}" (${companyId})`);

    // Insere o Curso Operador de Caixa
    const course = await sql`
      INSERT INTO courses (company_id, title, description, emoji, level, is_published, position, created_at)
      VALUES (
        ${companyId},
        'Operador de Caixa',
        'Formação Profissionalizante em Operação de Caixa, Atendimento ao Cliente e Operações Financeiras da Escola Avançada / ABACS.',
        '💳',
        'iniciante',
        true,
        4,
        NOW()
      )
      RETURNING id, title;
    `;

    console.log(`✓ Curso Operador de Caixa Cadastrado: ID ${course[0].id}`);

    // Insere Aulas do Curso Operador de Caixa
    await sql`
      INSERT INTO lessons (course_id, title, video_url, content, duration_min, position, created_at)
      VALUES
        (${course[0].id}, 'Aula 1: Abertura e Fechamento de Caixa', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Conceitos fundamentais de gestão de caixa e sangria de valores.', 15, 1, NOW()),
        (${course[0].id}, 'Aula 2: Atendimento e Formas de Pagamento (Pix, Cartão, Boleto)', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Como operar Maquininhas de Cartão e conferir recebimentos via Pix.', 20, 2, NOW());
    `;

    // Atualiza o token ABACS nas configurações da empresa
    await sql`
      UPDATE companies
      SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{abacsToken}', '"89945.18284682318tokenavancada"')
      WHERE id = ${companyId};
    `;

    console.log("✓ Token ABACS '89945.18284682318tokenavancada' salvo como padrão!");
    console.log("=========================================================");
    console.log("🎉 CONFIGURAÇÃO 'OPERADOR DE CAIXA' (CURSO 77) CONCLUÍDA!");
    console.log("=========================================================");
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await sql.end();
  }
}

main();
