export interface Tool {
  key: string;
  icon: string;
  name: string;
  url: string;
  tagline: string;
  uses: string[];
  training: string[];
}

/**
 * Catálogo de ferramentas open-source. São serviços opt-in do docker-compose
 * (profile "tools"); aqui a gente descreve, ensina e abre.
 */
export const TOOLS: Tool[] = [
  {
    key: "n8n",
    icon: "🔗",
    name: "n8n — Automação",
    url: "http://localhost:5678",
    tagline: "Conecte o Comenta a centenas de apps por webhooks, sem código.",
    uses: [
      "Ao abrir uma conversa (evento conversation.created), criar card no Trello/CRM.",
      "Encaminhar mensagens novas para e-mail, Slack, Google Sheets.",
      "Disparar campanhas e follow-ups automáticos.",
    ],
    training: [
      "1. Suba o n8n e crie a conta local (1º acesso).",
      "2. Novo workflow → nó Webhook → copie a URL.",
      "3. No painel, cadastre essa URL em Webhooks do Comenta.",
      "4. Adicione nós (e-mail, Sheets…) e ative o workflow.",
    ],
  },
  {
    key: "metabase",
    icon: "📊",
    name: "Metabase — BI & Relatórios",
    url: "http://localhost:3001",
    tagline: "Dashboards e relatórios sobre atendimentos, times e SLA.",
    uses: [
      "Volume de conversas por dia, time e canal.",
      "Tempo de 1ª resposta e taxa de resolução.",
      "Painéis para a diretoria, atualizados sozinhos.",
    ],
    training: [
      "1. Suba o Metabase e crie o admin (1º acesso).",
      "2. Conecte no Postgres do Comenta (host: postgres, db: comenta_saas).",
      "3. Monte perguntas (Questions) e junte em um Dashboard.",
      "4. Agende envio por e-mail dos relatórios.",
    ],
  },
  {
    key: "nocodb",
    icon: "🗂️",
    name: "NocoDB — Banco no-code",
    url: "http://localhost:8090",
    tagline: "Planilhas inteligentes / mini-CRM que a equipe monta sozinha.",
    uses: [
      "Base de clientes, contratos e catálogos de produtos.",
      "Kanban e grades sem depender de TI.",
      "Fonte de dados para o n8n e para formulários.",
    ],
    training: [
      "1. Suba o NocoDB e crie o admin (1º acesso).",
      "2. Nova Base → importe uma planilha ou comece do zero.",
      "3. Crie visões (grade, kanban, calendário).",
      "4. Gere uma API/webhook para integrar com o n8n.",
    ],
  },
  {
    key: "wascript",
    icon: "🌐",
    name: "WAScript — WhatsApp Web Extension & Notes",
    url: "https://app.wascript.com.br",
    tagline: "Extensão Chrome com CRM, anotações de contatos e autenticação Google OAuth.",
    uses: [
      "Painel lateral de anotações (Notes) diretamente na tela do WhatsApp Web.",
      "Sincronização de contatos com Google OAuth (hebertpaes@gmail.com).",
      "Geração de gatilhos e respostas rápidas integradas ao Comenta.",
    ],
    training: [
      "1. Acesse o WAScript e conecte sua conta Google OAuth.",
      "2. Instale a extensão no Google Chrome e ative o painel lateral em web.whatsapp.com.",
      "3. Sincronize suas anotações e contatos com o banco do Comenta SaaS.",
    ],
  },
];
