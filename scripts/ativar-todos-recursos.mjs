import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://comenta:3a24efa594604b1e10d2e2b2346e5dc9@localhost:5432/comenta_saas";

console.log("=========================================================");
console.log("  🚀 ATIVANDO TODOS OS RECURSOS & EXPANDINDO BASE DE IA");
console.log("=========================================================");

async function main() {
  const sql = postgres(DATABASE_URL);

  try {
    // 1) Busca a empresa cadastrada
    const companies = await sql`SELECT id, name FROM companies LIMIT 1;`;
    if (!companies.length) {
      console.log("❌ Nenhuma empresa encontrada.");
      await sql.end();
      return;
    }

    const companyId = companies[0].id;
    console.log(`✓ Empresa selecionada: "${companies[0].name}" (${companyId})`);

    // 2) Ampliação Master da Base de Conhecimento de IA no PostgreSQL
    const masterKnowledge = `
# BASE DE CONHECIMENTO OFICIAL COMENTA AI (GOOGE GEMINI IA)

## 1. Visão Geral do Sistema
O Comenta é a plataforma SaaS de atendimento multicanal líder no Brasil. Reúne WhatsApp, Instagram Direct, Facebook Messenger, E-mail e WebChat em uma única caixa de entrada inteligente.

## 2. Planos & Preços
- **Plano Starter (R$ 149/mês)**: 1 Número de WhatsApp, 3 Atendentes, Atendimento Humano + Bot Básico.
- **Plano Pro 🔥 (R$ 349/mês)**: 3 Números de WhatsApp, 10 Atendentes, IA Google Gemini Generativa, Kanban CRM, Relatórios NPS.
- **Plano Enterprise (R$ 799/mês)**: Conexões e Atendentes Ilimitados, Webhooks, API Keys dedicadas e Suporte VIP 24/7.

## 3. Loja de Cursos & Serviços Profissionais
- Formação Atendente IA & Vendas (R$ 297)
- Masterclass Automações Avançadas n8n (R$ 497)
- Implantação Turnkey em 48 horas (R$ 1.200)

## 4. Funcionalidades Principais
1. **Caixa de Entrada Única**: Centraliza todas as conversas sem perder histórico.
2. **Agentes de IA Autônomos**: Sofia (Vendas), Pixel (Banners/Artes), Cine (Vídeos/Roteiros), Bruno (Onboarding), Atlas (BI).
3. **Disparo de Campanhas em Massa**: Transmissão para listas de contatos com acompanhamento de taxa de leitura.
4. **CRM Kanban Integrado**: Mova cards entre colunas (Lead, Proposta, Fechado, Pós-Venda).
5. **Pesquisa de Satisfação NPS**: Envio automático de pesquisa de notas 1 a 5 após a resolução.

## 5. Suporte & Transbordo Humano
Se o cliente solicitar falar com um atendente humano, a IA deve responder cordialmente e acionar o transbordo para a fila correspondente (Vendas, Suporte ou Financeiro).
`;

    await sql`
      UPDATE companies
      SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{widgetKnowledge}', ${JSON.stringify(masterKnowledge)})
      WHERE id = ${companyId};
    `;
    console.log("✓ Base de Conhecimento Ampliada atualizada com sucesso!");

    // 3) Ativação/Atualização das 5 Automações do Sistema
    await sql`DELETE FROM automations WHERE company_id = ${companyId};`;

    const automationsData = [
      {
        name: "🤖 Sofia — Autoatendimento & Qualificação de Leads (Google Gemini IA)",
        type: "ai",
        config: {
          knowledge: masterKnowledge,
          tone: "cordial, objetivo e focado em entender o cliente e oferecer o plano ideal",
          handoffKeywords: ["humano", "atendente", "falar com pessoa", "suporte", "financeiro", "ajuda"],
          handoffMessage: "Certo! Estou transferindo seu atendimento para a nossa equipe humana. Um instante, por favor. 🙂"
        }
      },
      {
        name: "👋 Boas-vindas Automáticas ao Novo Cliente",
        type: "welcome",
        config: {
          message: "Olá! Seja muito bem-vindo ao atendimento do Comenta AI. Como posso te ajudar hoje?"
        }
      },
      {
        name: "🌙 Aviso Fora do Horário Comercial",
        type: "business_hours",
        config: {
          days: [1, 2, 3, 4, 5],
          start: "08:00",
          end: "18:00",
          message: "Nosso horário de atendimento humano é de segunda a sexta, das 08h às 18h. Deixe sua mensagem que a nossa IA ou um atendente responderá em breve!"
        }
      },
      {
        name: "⚡ Resposta Rápida por Palavra-Chave (Planos e Valores)",
        type: "keyword",
        config: {
          keywords: ["preço", "preço", "valores", "quanto custa", "planos"],
          reply: "Nossos planos começam em R$ 149/mês no Starter e R$ 349/mês no Pro com IA Google Gemini inclusa! Quer testar grátis?"
        }
      },
      {
        name: "⭐ Pesquisa de Satisfação NPS Pós-Atendimento",
        type: "rating",
        config: {
          message: "Como você avalia o atendimento recebido hoje? Digite uma nota de 1 a 5 estrelas. Obrigado pela sua opinião!"
        }
      }
    ];

    for (const a of automationsData) {
      await sql`
        INSERT INTO automations (company_id, name, type, config, is_active, created_at)
        VALUES (${companyId}, ${a.name}, ${a.type}, ${JSON.stringify(a.config)}, true, NOW());
      `;
    }
    console.log(`✓ Total de ${automationsData.length} Automações Ativadas!`);

    // 4) Garantir Filas de Atendimento (Queues)
    const existingQueues = await sql`SELECT id FROM queues WHERE company_id = ${companyId};`;
    if (existingQueues.length < 3) {
      const queuesData = [
        { name: "Comercial & Vendas", color: "#10b981", orderIndex: 1 },
        { name: "Suporte Técnico", color: "#3b82f6", orderIndex: 2 },
        { name: "Financeiro & Faturamento", color: "#8b5cf6", orderIndex: 3 },
        { name: "Triagem por IA Gemini", color: "#ec4899", orderIndex: 4 }
      ];
      for (const q of queuesData) {
        await sql`
          INSERT INTO queues (company_id, name, color, order_index, created_at)
          VALUES (${companyId}, ${q.name}, ${q.color}, ${q.orderIndex}, NOW())
          ON CONFLICT DO NOTHING;
        `;
      }
      console.log("✓ Filas de atendimento configuradas!");
    }

    // 5) Garantir Respostas Rápidas (Quick Replies)
    const existingQuickReplies = await sql`SELECT id FROM quick_replies WHERE company_id = ${companyId};`;
    if (existingQuickReplies.length < 3) {
      const qrData = [
        { shortcut: "planos", message: "Conheça nossos planos: Starter R$ 149/mês, Pro R$ 349/mês e Enterprise R$ 799/mês. Todos com suporte completo!" },
        { shortcut: "pix", message: "Nossa chave Pix CNPJ é 12.345.678/0001-90 (Comenta Atendimento Inteligente Ltda)." },
        { shortcut: "loja", message: "Acesse a nossa loja oficial de cursos e módulos extras em: http://localhost:3000/loja" }
      ];
      for (const qr of qrData) {
        await sql`
          INSERT INTO quick_replies (company_id, shortcut, message, created_at)
          VALUES (${companyId}, ${qr.shortcut}, ${qr.message}, NOW())
          ON CONFLICT DO NOTHING;
        `;
      }
      console.log("✓ Respostas rápidas cadastradas!");
    }

    console.log("=========================================================");
    console.log("🎉 TODOS OS RECURSOS DO COMENTA FORAM ATIVADOS E EXPANDIDOS!");
    console.log("=========================================================");
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    await sql.end();
  }
}

main();
