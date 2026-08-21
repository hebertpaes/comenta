export interface NavItem {
  to: string;
  label: string;
  /** Só aparece para admin. Espelha o `RequireAdmin` das rotas — a decisão de
   *  verdade continua na API; aqui é só não mostrar o que vai dar 403. */
  adminOnly?: boolean;
  /** Oculta da barra lateral, mas permite busca na paleta. */
  hidden?: boolean;
  /** Palavras que o usuário pode digitar na paleta procurando esta tela, sem
   *  que apareçam no rótulo (ex.: "nps" para Avaliações). */
  aliases?: string[];
}

/**
 * Uma lista só de telas, usada pela barra lateral e pela paleta de comandos.
 * Quando estava dentro do AppLayout, qualquer tela nova precisava ser lembrada
 * nos dois lugares.
 */
export const NAV: NavItem[] = [
  { to: "/dashboard", label: "📊 Dashboard", aliases: ["início", "home", "métricas"] },
  { to: "/conversas", label: "💬 Conversas", aliases: ["atendimento", "inbox"] },
  { to: "/kanban", label: "📋 Kanban", aliases: ["funil", "quadro"] },
  { to: "/erp", label: "💼 CRM & ERP", aliases: ["financeiro", "vendas", "estoque", "menu"] },
  { to: "/equipe", label: "💬 Equipe", aliases: ["chat interno"] },
  { to: "/contatos", label: "👥 Contatos", aliases: ["clientes", "agenda"] },
  { to: "/usuarios", label: "🧑‍💼 Usuários", adminOnly: true, aliases: ["atendentes", "equipe"] },
  { to: "/filas", label: "🗂️ Filas", adminOnly: true, aliases: ["setores", "departamentos"] },
  { to: "/respostas", label: "⚡ Respostas", aliases: ["atalhos", "quick replies"] },
  { to: "/tags", label: "🏷️ Tags", adminOnly: true, aliases: ["etiquetas"] },
  { to: "/avaliacoes", label: "⭐ Avaliações", aliases: ["nps", "satisfação", "notas"] },
  { to: "/config", label: "⚙️ Configurações", adminOnly: true, aliases: ["settings"] },
  { to: "/permissoes", label: "🛡️ Permissões", adminOnly: true, aliases: ["rbac", "cargos", "niveis"] },
  { to: "/automacoes", label: "🤖 Automações", aliases: ["bot", "regras"] },
  { to: "/flowbuilder", label: "⚡ FlowBuilder IA", aliases: ["construtor", "fluxos", "visual"] },
  { to: "/agentes", label: "🤖 Agentes IA & Mídia", aliases: ["ia", "agente", "imagens", "vídeo", "banners"] },
  {
    to: "/campanhas",
    label: "📣 Campanhas",
    adminOnly: true,
    aliases: ["disparo", "envio em massa"],
  },
  { to: "/ferramentas", label: "🧩 Ferramentas" },
  { to: "/cursos", label: "🎓 Academia", aliases: ["treinamento", "aulas"] },
  { to: "/gumesmomo", label: "🍬 Gumesmomo.fit", aliases: ["goma", "creatina", "fitness", "saude"] },
  { to: "/conexoes", label: "📲 Conexões", aliases: ["whatsapp", "canais", "instagram"] },
  { to: "/chaves", label: "🔑 Chaves de API", adminOnly: true, aliases: ["api key", "token"] },
  { to: "/webhooks", label: "🪝 Webhooks", adminOnly: true, aliases: ["integração", "callback"] },
];

/** Normaliza para busca: minúsculas e sem acento, de modo que "avaliacoes"
 *  encontre "Avaliações". */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchNav(items: NavItem[], term: string): NavItem[] {
  const t = fold(term.trim());
  if (!t) return items;
  return items.filter((i) => fold(`${i.label} ${i.aliases?.join(" ") ?? ""}`).includes(t));
}
