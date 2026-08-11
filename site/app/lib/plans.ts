/**
 * Planos do Comenta — fonte única para o site.
 *
 * Os números aqui espelham `saas/api/src/db/seed.ts`, que é o que a API
 * **de fato** aplica. A landing já anunciou limites diferentes dos cobrados
 * ("conversas ilimitadas" no Pro, "usuários ilimitados" no Business) e isso é
 * pior que um erro de vitrine: o cliente assina, bate no limite e descobre que
 * o site prometeu o que o produto não entrega.
 *
 * Ao mexer nos planos, mude o `seed.ts` primeiro e traga os valores para cá.
 */

export type Plano = {
  id: "free" | "pro" | "business";
  nome: string;
  precoCentavos: number;
  /** "R$99" — derivado de precoCentavos, para não repetir formatação. */
  preco: string;
  periodo: string;
  desc: string;
  destaque: boolean;
  cta: string;
  /** Limites cobrados pela API. `null` em nenhum deles: todos têm teto. */
  limites: {
    usuarios: number;
    canais: number;
    contatos: number;
    mensagensMes: number;
  };
  /** Chaves de `features` no seed, para o comparativo. */
  recursos: string[];
  /** Frases curtas para os cartões da home. */
  itens: string[];
};

function brl(centavos: number): string {
  return centavos === 0 ? "R$0" : `R$${(centavos / 100).toLocaleString("pt-BR")}`;
}

const n = (v: number) => v.toLocaleString("pt-BR");

export const PLANOS: Plano[] = [
  {
    id: "free",
    nome: "Free",
    precoCentavos: 0,
    preco: brl(0),
    periodo: "para sempre",
    desc: "Para começar e testar.",
    destaque: false,
    cta: "Começar grátis",
    limites: { usuarios: 3, canais: 1, contatos: 500, mensagensMes: 1000 },
    recursos: ["multicanal", "ia_basica"],
    itens: [
      "3 usuários",
      "1 canal",
      "IA básica (classificação)",
      `${n(1000)} mensagens/mês`,
      `${n(500)} contatos`,
    ],
  },
  {
    id: "pro",
    nome: "Pro",
    precoCentavos: 9900,
    preco: brl(9900),
    periodo: "/mês",
    desc: "Para equipes que atendem de verdade.",
    destaque: true,
    cta: "Assinar Pro",
    limites: { usuarios: 15, canais: 5, contatos: 10000, mensagensMes: 50000 },
    recursos: ["multicanal", "ia_avancada", "api", "webhooks"],
    itens: [
      "15 usuários",
      "5 canais",
      "IA completa (resumo + sugestão)",
      `${n(50000)} mensagens/mês`,
      "API e webhooks",
    ],
  },
  {
    id: "business",
    nome: "Business",
    precoCentavos: 29900,
    preco: brl(29900),
    periodo: "/mês",
    desc: "Para operações e multi-marca.",
    destaque: false,
    cta: "Falar com vendas",
    limites: { usuarios: 100, canais: 20, contatos: 200000, mensagensMes: 1000000 },
    recursos: ["multicanal", "ia_avancada", "api", "webhooks", "sla", "sso"],
    itens: [
      "100 usuários",
      "20 canais",
      "IA completa (resumo + sugestão)",
      `${n(1000000)} mensagens/mês`,
      "SLA e SSO",
    ],
  },
];

/** Linhas do comparativo em /precos. `valor` recebe o plano e devolve a célula. */
export const COMPARATIVO: {
  grupo: string;
  linhas: { nome: string; valor: (p: Plano) => string | boolean; nota?: string }[];
}[] = [
  {
    grupo: "Limites",
    linhas: [
      { nome: "Usuários", valor: (p) => n(p.limites.usuarios) },
      { nome: "Canais conectados", valor: (p) => n(p.limites.canais) },
      { nome: "Contatos", valor: (p) => n(p.limites.contatos) },
      { nome: "Mensagens por mês", valor: (p) => n(p.limites.mensagensMes) },
    ],
  },
  {
    grupo: "Atendimento",
    linhas: [
      { nome: "Caixa de entrada multicanal", valor: (p) => p.recursos.includes("multicanal") },
      { nome: "Filas e distribuição", valor: () => true },
      { nome: "Tags e respostas rápidas", valor: () => true },
      { nome: "App iOS", valor: () => true },
    ],
  },
  {
    grupo: "Inteligência artificial",
    linhas: [
      {
        nome: "Classificação da conversa",
        valor: (p) => p.recursos.includes("ia_basica") || p.recursos.includes("ia_avancada"),
      },
      { nome: "Resumo para handoff", valor: (p) => p.recursos.includes("ia_avancada") },
      { nome: "Sugestão de resposta", valor: (p) => p.recursos.includes("ia_avancada") },
      {
        nome: "Autoatendimento por IA",
        valor: (p) => p.recursos.includes("ia_avancada"),
        nota: "A IA responde o cliente sozinha e transfere quando precisa de gente.",
      },
    ],
  },
  {
    grupo: "Integrações e operação",
    linhas: [
      { nome: "API REST", valor: (p) => p.recursos.includes("api") },
      { nome: "Webhooks assinados (HMAC)", valor: (p) => p.recursos.includes("webhooks") },
      { nome: "SLA contratual", valor: (p) => p.recursos.includes("sla") },
      { nome: "SSO", valor: (p) => p.recursos.includes("sso") },
    ],
  },
];

/**
 * Menor plano que atende o uso informado, ou `null` se estourar o Business.
 * Usado pela calculadora — a ordem de PLANOS é do menor para o maior.
 */
export function planoRecomendado(uso: {
  usuarios: number;
  canais: number;
  mensagensMes: number;
}): Plano | null {
  return (
    PLANOS.find(
      (p) =>
        uso.usuarios <= p.limites.usuarios &&
        uso.canais <= p.limites.canais &&
        uso.mensagensMes <= p.limites.mensagensMes
    ) ?? null
  );
}
