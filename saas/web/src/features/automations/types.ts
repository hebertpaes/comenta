import type { AutomationType } from "@comenta/shared";

export interface AutomationTypeMeta {
  label: string;
  icon: string;
  hint: string;
}

export const AUTOMATION_TYPE_META: Record<AutomationType, AutomationTypeMeta> = {
  ai: {
    label: "Autoatendimento por IA",
    icon: "🤖",
    hint: "A IA Claude responde o cliente sozinha usando a sua base de conhecimento e transfere para um humano quando necessário.",
  },
  welcome: {
    label: "Boas-vindas",
    icon: "👋",
    hint: "Responde automaticamente na 1ª mensagem de cada nova conversa.",
  },
  business_hours: {
    label: "Fora do horário",
    icon: "🕐",
    hint: "Responde só quando o cliente escreve fora do horário de atendimento.",
  },
  keyword: {
    label: "Palavra-chave",
    icon: "🔑",
    hint: "Responde quando a mensagem do cliente contém um dos termos.",
  },
  rating: {
    label: "Avaliação / NPS",
    icon: "⭐",
    hint: "Ao resolver a conversa, pede uma nota ao cliente. A resposta numérica vira uma avaliação (aparece no Dashboard).",
  },
};

export const WEEKDAYS: [label: string, value: number][] = [
  ["Seg", 1],
  ["Ter", 2],
  ["Qua", 3],
  ["Qui", 4],
  ["Sex", 5],
  ["Sáb", 6],
  ["Dom", 7],
];
