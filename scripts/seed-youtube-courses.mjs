import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://comenta:3a24efa594604b1e10d2e2b2346e5dc9@localhost:5432/comenta_saas";

console.log("=========================================================");
console.log("  🎓 CRIANDO CURSOS COM VÍDEOS EMBUTIDOS DO YOUTUBE");
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

    // Limpa cursos antigos para recriar com vídeos do YouTube
    await sql`DELETE FROM courses WHERE company_id = ${companyId};`;

    // 1) Curso 1: Formação Completa em Atendente IA & Vendas no WhatsApp
    const c1 = await sql`
      INSERT INTO courses (company_id, title, description, emoji, level, is_published, position, created_at)
      VALUES (
        ${companyId},
        'Formação Atendente IA & Vendas no WhatsApp',
        'Aprenda a configurar os robôs autônomos de IA Google Gemini para qualificar leads, tirar dúvidas e fechar vendas no WhatsApp 24h por dia.',
        '🎓',
        'iniciante',
        true,
        1,
        NOW()
      )
      RETURNING id, title;
    `;

    await sql`
      INSERT INTO lessons (course_id, title, video_url, content, duration_min, position, created_at)
      VALUES
        (${c1[0].id}, 'Aula 1: Apresentação e Visão Geral dos Robôs de IA', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Nesta aula introdutória você vai conhecer como a IA do Comenta responde clientes de forma humana e personalizada.', 10, 1, NOW()),
        (${c1[0].id}, 'Aula 2: Treinando a IA com a Base do seu Negócio', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Aprenda a cadastrar preços, horários de atendimento e regras de transbordo no painel.', 15, 2, NOW()),
        (${c1[0].id}, 'Aula 3: Qualificação de Leads e Fechamento de Vendas', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Estratégias avançadas para direcionar leads qualificados para o Kanban CRM.', 20, 3, NOW());
    `;
    console.log(`✓ Curso 1 Cadastrado com Vídeos do YouTube: "${c1[0].title}"`);

    // 2) Curso 2: Masterclass Automações n8n, Webhooks & Hotmart
    const c2 = await sql`
      INSERT INTO courses (company_id, title, description, emoji, level, is_published, position, created_at)
      VALUES (
        ${companyId},
        'Masterclass Automações n8n, Webhooks & Hotmart',
        'Aprenda a conectar a Hotmart ao Comenta API para matricular alunos automaticamente e disparar mensagens de boas-vindas no WhatsApp.',
        '⚡',
        'intermediario',
        true,
        2,
        NOW()
      )
      RETURNING id, title;
    `;

    await sql`
      INSERT INTO lessons (course_id, title, video_url, content, duration_min, position, created_at)
      VALUES
        (${c2[0].id}, 'Aula 1: Configurando o Webhook da Hotmart', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Passo a passo de como copiar a URL do webhook e cadastrar no Hotmart Club.', 12, 1, NOW()),
        (${c2[0].id}, 'Aula 2: Disparo de Mensagens Transacionais no WhatsApp', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Como criar templates de WhatsApp com links diretos das videoaulas.', 18, 2, NOW());
    `;
    console.log(`✓ Curso 2 Cadastrado com Vídeos do YouTube: "${c2[0].title}"`);

    // 3) Curso 3: Gestão Multicanal, CRM Kanban & Métricas NPS
    const c3 = await sql`
      INSERT INTO courses (company_id, title, description, emoji, level, is_published, position, created_at)
      VALUES (
        ${companyId},
        'Gestão Multicanal, CRM Kanban & Métricas NPS',
        'Domine a caixa de entrada unificada, organize seu funil de atendimento e acompanhe a satisfação dos seus clientes em tempo real.',
        '🚀',
        'avancado',
        true,
        3,
        NOW()
      )
      RETURNING id, title;
    `;

    await sql`
      INSERT INTO lessons (course_id, title, video_url, content, duration_min, position, created_at)
      VALUES
        (${c3[0].id}, 'Aula 1: Organizando o CRM Kanban', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Como criar etiquetas, mover cards e priorizar clientes VIP no funil.', 14, 1, NOW()),
        (${c3[0].id}, 'Aula 2: Análise de Métricas e Relatórios NPS', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Como interpretar o Tempo Médio de Resposta (TME) e as avaliações de 1 a 5 estrelas.', 16, 2, NOW());
    `;
    console.log(`✓ Curso 3 Cadastrado com Vídeos do YouTube: "${c3[0].title}"`);

    console.log("=========================================================");
    console.log("🎉 CURSOS DO YOUTUBE CRIADOS E CONECTADOS COM SUCESSO!");
    console.log("=========================================================");
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await sql.end();
  }
}

main();
