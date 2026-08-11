import type { ConversationFilters } from "./endpoints";

/**
 * Chaves de cache do TanStack Query, num lugar só.
 *
 * Centralizar evita o erro clássico de invalidar `["contacts"]` num arquivo e
 * consultar `["contact-list"]` em outro — a tela simplesmente não atualizaria e
 * o motivo seria difícil de achar.
 */
export const keys = {
  me: ["me"] as const,
  metrics: ["dashboard", "metrics"] as const,

  conversations: (f: ConversationFilters = {}) => ["conversations", f] as const,
  conversation: (id: string) => ["conversation", id] as const,
  notes: (conversationId: string) => ["conversation", conversationId, "notes"] as const,

  contacts: (q?: string) => ["contacts", q ?? ""] as const,
  users: ["users"] as const,
  queues: ["queues"] as const,
  quickReplies: ["quick-replies"] as const,
  tags: ["tags"] as const,
  channels: ["channels"] as const,
  channelStatus: (id: string) => ["channel", id, "status"] as const,
  automations: ["automations"] as const,
  courses: ["courses"] as const,
  course: (id: string) => ["course", id] as const,
  campaigns: ["campaigns"] as const,
  teamMessages: ["team", "messages"] as const,
  settings: ["settings"] as const,
};
