import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://comenta:3a24efa594604b1e10d2e2b2346e5dc9@localhost:5432/comenta_saas";

const TOP_DEMANDED_COURSES = [
  {
    title: "Engenharia de Prompt & Inteligência Artificial",
    description: "Aprenda a criar comandos avançados no Google Gemini, ChatGPT e automações de IA para empresas.",
    emoji: "🤖",
    level: "intermediario",
    price: 149.00,
    lessons: [
      "Fundamentos de LLMs e Engenharia de Prompt",
      "Criação de Agentes Autônomos de Atendimento",
      "Automação de Vendas no WhatsApp com Gemini API",
      "Integração de IA com Banco de Dados e N8N"
    ]
  },
  {
    title: "Cibersegurança & Proteção de Dados (LGPD)",
    description: "Defesa cibernética, testes de invasão éticos, segurança de redes e adequação à LGPD.",
    emoji: "🛡️",
    level: "avancado",
    price: 199.00,
    lessons: [
      "Princípios da Segurança da Informação",
      "Análise de Vulnerabilidades e Firewalls",
      "Conceitos de Criptografia e Proteção de Senhas",
      "Conformidade e Implementação Prática da LGPD"
    ]
  },
  {
    title: "Gestão de Tráfego Pago & Performance (Google & Meta Ads)",
    description: "Domine campanhas patrocinadas no Google Ads, Instagram, Facebook e TikTok Ads para gerar vendas diárias.",
    emoji: "📈",
    level: "intermediario",
    price: 149.00,
    lessons: [
      "Estratégia de Campanhas e Funil de Vendas",
      "Google Search, Display e YouTube Ads",
      "Meta Ads: Facebook e Instagram para Negócios",
      "Mensuração de Métricas (ROAS, CPA, CTR) e Otimização"
    ]
  },
  {
    title: "Análise de Dados com Power BI & Excel Avançado",
    description: "Transforme dados brutos em dashboards visuais e inteligência de negócios para tomada de decisão.",
    emoji: "📊",
    level: "intermediario",
    price: 129.00,
    lessons: [
      "Limpeza e Tratamento de Dados no Power Query",
      "Criação de Fórmulas DAX e Tabelas Dinâmicas",
      "Design de Dashboards Executivos e Relatórios Interativos",
      "Publicação e Compartilhamento de Indicadores em Nuvem"
    ]
  },
  {
    title: "Gestão de Logística & E-commerce 4.0",
    description: "Cadeia de suprimentos, gestão de estoque, expedição rápida e estratégias de frete no e-commerce.",
    emoji: "🚚",
    level: "iniciante",
    price: 99.00,
    lessons: [
      "Operações de Armazenagem e Controle de Estoque (WMS)",
      "Logística Reversa e Gestão de Transportes",
      "Integração de Marketplaces (Mercado Livre, Shopee, Amazon)",
      "Otimização de Prazos de Entrega e Redução de Custos"
    ]
  }
];

async function main() {
  const sql = postgres(DATABASE_URL);
  console.log("=========================================================");
  console.log(" 🚀 CADASTRANDO OS CURSOS MAIS PROCURADOS DE 2026 NO COMENTA");
  console.log("=========================================================");

  try {
    const comp = await sql`SELECT id, name FROM companies LIMIT 1;`;
    if (!comp.length) {
      console.log("❌ Nenhuma empresa encontrada.");
      await sql.end();
      return;
    }
    const companyId = comp[0].id;

    for (const c of TOP_DEMANDED_COURSES) {
      const existing = await sql`SELECT id FROM courses WHERE title = ${c.title} AND company_id = ${companyId};`;
      if (!existing.length) {
        const [inserted] = await sql`
          INSERT INTO courses (company_id, title, description, emoji, level, is_published, position, created_at)
          VALUES (${companyId}, ${c.title}, ${c.description}, ${c.emoji}, ${c.level}, true, 10, NOW())
          RETURNING id;
        `;

        for (let i = 0; i < c.lessons.length; i++) {
          await sql`
            INSERT INTO lessons (course_id, title, video_url, content, duration_min, position, created_at)
            VALUES (${inserted.id}, ${'Aula ' + (i + 1) + ': ' + c.lessons[i]}, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', ${c.lessons[i]}, 25, ${i + 1}, NOW());
          `;
        }
        console.log(` + Cadastrado curso de alta demanda: "${c.title}" (${c.price})`);
      } else {
        console.log(` - Já existe: "${c.title}"`);
      }
    }

    console.log("=========================================================");
    console.log("🎉 CURSOS MAIS PROCURADOS DE 2026 CADASTRADOS COM SUCESSO!");
    console.log("=========================================================");
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await sql.end();
  }
}

main();
