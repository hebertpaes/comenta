/**
 * Catálogo dos serviços do Comenta local. Único lugar a editar quando a stack
 * ganhar ou perder um serviço — o popup e o manifest derivam daqui.
 *
 * `sonda` é o caminho usado no teste de saúde. Onde a raiz já responde barato,
 * usamos "/"; onde existe endpoint dedicado, ele é preferido (mais honesto que
 * um 200 de HTML estático).
 *
 * `lan: true` marca os serviços que o `local-mac.sh --lan` publica no Wi-Fi —
 * são os únicos que fazem sentido abrir no iPhone.
 */
export const SERVICOS = [
  {
    id: "painel",
    nome: "Painel",
    descricao: "Atendimento — conversas, kanban, filas",
    porta: 8080,
    sonda: "/",
    grupo: "produto",
    lan: true,
  },
  {
    id: "site",
    nome: "Site",
    descricao: "Landing institucional + widget de chat",
    porta: 3000,
    sonda: "/health",
    grupo: "produto",
    lan: true,
  },
  {
    id: "api",
    nome: "API",
    descricao: "Backend REST — /docs traz o OpenAPI",
    porta: 4000,
    sonda: "/health",
    grupo: "produto",
    lan: true,
    abrirEm: "/docs",
  },
  {
    id: "ghost",
    nome: "Ghost",
    descricao: "Blog — /ghost abre o admin",
    porta: 2368,
    sonda: "/",
    grupo: "conteudo",
    abrirEm: "/ghost",
  },
  {
    id: "n8n",
    nome: "n8n",
    descricao: "Automação por webhooks, sem código",
    porta: 5678,
    sonda: "/",
    grupo: "ferramenta",
    perfil: "tools",
  },
  {
    id: "nocodb",
    nome: "NocoDB",
    descricao: "Planilhas inteligentes / mini-CRM",
    porta: 8090,
    sonda: "/",
    grupo: "ferramenta",
    perfil: "tools",
  },
  {
    id: "metabase",
    nome: "Metabase",
    descricao: "BI e relatórios sobre o atendimento",
    porta: 3001,
    sonda: "/",
    grupo: "ferramenta",
    perfil: "tools",
  },
  {
    id: "moodle",
    nome: "Moodle",
    descricao: "Academia — cursos e treinamento",
    porta: 8088,
    sonda: "/",
    grupo: "ferramenta",
  },
];

export const GRUPOS = [
  { id: "produto", titulo: "Produto" },
  { id: "conteudo", titulo: "Conteúdo" },
  { id: "ferramenta", titulo: "Ferramentas" },
];

/** URL base de um serviço num dado host (localhost por padrão). */
export function urlDe(servico, host = "localhost") {
  return `http://${host}:${servico.porta}`;
}
