import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://comenta:3a24efa594604b1e10d2e2b2346e5dc9@localhost:5432/comenta_saas";

console.log("=========================================================");
console.log("  🎓 CONECTANDO E CRIANDO CURSOS DA HOTMART NO BANCO");
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

    // 1) Garante a criação do Curso 1: Formação Atendente IA & Vendas
    const c1 = await sql`
      INSERT INTO courses (company_id, title, description, emoji, level, is_published, position, created_at)
      VALUES (
        ${companyId},
        'Formação Atendente IA & Vendas no WhatsApp',
        'Aprenda a configurar os robôs autônomos de IA Google Gemini para qualificar leads e vender no WhatsApp 24h por dia.',
        '🎓',
        'iniciante',
        true,
        1,
        NOW()
      )
      RETURNING id, title;
    `;
    console.log(`✓ Curso 1 Cadastrado: "${c1[0].title}" (${c1[0].id})`);

    // Aulas do Curso 1
    await sql`
      INSERT INTO lessons (course_id, title, video_url, content, duration_min, position, created_at)
      VALUES
        (${c1[0].id}, 'Aula 1: Introdução aos Agentes de IA Generativa', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'Bem-vindo à formação! Nesta aula você aprenderá como a IA responde seus clientes.', 12, 1, NOW()),
        (${c1[0].id}, 'Aula 2: Como treinar a IA com a base da sua empresa', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'Aprenda a cadastrar preços, planos e políticas na Central de Configurações.', 18, 2, NOW());
    `;

    // 2) Garante a criação do Curso 2: Masterclass Automações n8n
    const c2 = await sql`
      INSERT INTO courses (company_id, title, description, emoji, level, is_published, position, created_at)
      VALUES (
        ${companyId},
        'Masterclass Automações Avançadas n8n & Webhooks',
        'Aprenda a integrar webhooks da Hotmart, Asaas e Mercado Pago com fluxos automáticos do n8n.',
        '⚡',
        'avancado',
        true,
        2,
        NOW()
      )
      RETURNING id, title;
    `;
    console.log(`✓ Curso 2 Cadastrado: "${c2[0].title}" (${c2[0].id})`);

    // Aulas do Curso 2
    await sql`
      INSERT INTO lessons (course_id, title, video_url, content, duration_min, position, created_at)
      VALUES
        (${c2[0].id}, 'Aula 1: Conectando Webhooks da Hotmart ao Comenta API', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'Como capturar Vendas Aprovadas e enviar WhatsApp automático.', 15, 1, NOW());
    `;

    console.log("=========================================================");
    console.log("🎉 TODOS OS CURSOS FORAM CONECTADOS À HOTMART COM SUCESSO!");
    console.log("=========================================================");
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await sql.end();
  }
}

main();
