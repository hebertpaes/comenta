import type {
  ApiKey,
  ApiKeyCreated,
  Automation,
  Campaign,
  Channel,
  ChannelLiveStatus,
  ChannelsResponse,
  CompanySettings,
  Contact,
  ConversationDetail,
  ConversationListItem,
  ConversationNote,
  ConversationStatus,
  Course,
  DashboardMetrics,
  Lesson,
  Listed,
  LoginResponse,
  MeResponse,
  Message,
  Paginated,
  Queue,
  QuickReply,
  Rating,
  RatingMetrics,
  SignupResponse,
  Tag,
  TeamMessage,
  User,
  Webhook,
  WebhookCreated,
  WebhookDelivery,
  WebhookEvent,
} from "@comenta/shared";
import { http, qs } from "../lib/http";
import { clearTokens, getRefreshToken, setTokens } from "../lib/tokens";

/**
 * Um lugar só para as chamadas de rede, tipadas pelos contratos de
 * @comenta/shared. Os hooks de cache ficam em `queries.ts`; aqui é só o que
 * fala HTTP, o que mantém as duas coisas testáveis em separado.
 */

export const auth = {
  login: async (email: string, password: string) => {
    const r = await http.post<LoginResponse>("/auth/login", { email, password });
    setTokens(r.accessToken, r.refreshToken);
    return r;
  },

  signup: async (companyName: string, name: string, email: string, password: string) => {
    const r = await http.post<SignupResponse>("/auth/signup", {
      companyName,
      name,
      email,
      password,
    });
    setTokens(r.accessToken, r.refreshToken);
    return r;
  },

  // Revoga o refresh token no servidor antes de limpar o local: sem isso ele
  // seguia válido por 30 dias (REFRESH_TOKEN_TTL_DAYS) mesmo depois de "sair".
  logout: () => {
    const token = getRefreshToken();
    clearTokens();
    if (token) {
      void http.post("/auth/logout", { refreshToken: token }).catch(() => {
        // Best-effort: a sessão local já foi encerrada de qualquer forma.
      });
    }
  },

  me: () => http.get<MeResponse>("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    http.post<{ ok: true }>("/auth/change-password", { currentPassword, newPassword }),
};

export const dashboard = {
  metrics: () => http.get<DashboardMetrics>("/dashboard/metrics"),
};

export interface ConversationFilters {
  status?: ConversationStatus;
  queueId?: string;
  assignedToMe?: boolean;
}

export const conversations = {
  list: (f: ConversationFilters = {}) =>
    http.get<Paginated<ConversationListItem>>(
      `/conversations${qs({
        status: f.status,
        queueId: f.queueId,
        assignedToMe: f.assignedToMe ? "true" : undefined,
      })}`
    ),
  get: (id: string) => http.get<ConversationDetail>(`/conversations/${id}`),
  sendMessage: (id: string, body: string) =>
    http.post<Message>(`/conversations/${id}/messages`, { body }),
  update: (
    id: string,
    patch: {
      status?: ConversationStatus;
      assignedUserId?: string | null;
      queueId?: string | null;
    }
  ) => http.patch<ConversationDetail>(`/conversations/${id}`, patch),
  setTags: (id: string, tagIds: string[]) =>
    http.put<{ conversationId: string; tagIds: string[] }>(`/conversations/${id}/tags`, { tagIds }),
  notes: (id: string) => http.get<Listed<ConversationNote>>(`/conversations/${id}/notes`),
  addNote: (id: string, body: string) =>
    http.post<ConversationNote>(`/conversations/${id}/notes`, { body }),
  deleteNote: (noteId: string) => http.del<null>(`/notes/${noteId}`),
};

/** Formas exatas devolvidas por modules/ai.ts — cada endpoint devolve uma
 *  coisa diferente, não um `result` genérico. */
export interface AiClassification {
  category: string;
  intent: string;
  sentiment: "positivo" | "neutro" | "negativo";
  urgency: "baixa" | "media" | "alta";
  summary: string;
}

export const ai = {
  classify: (id: string) => http.post<AiClassification>(`/conversations/${id}/ai/classify`),
  summary: (id: string) => http.post<{ summary: string }>(`/conversations/${id}/ai/summary`),
  suggest: (id: string, tone?: string) =>
    http.post<{ suggestion: string }>(`/conversations/${id}/ai/suggest`, tone ? { tone } : {}),
};

export const contacts = {
  list: (q?: string) => http.get<Paginated<Contact>>(`/contacts${qs({ q, perPage: 100 })}`),
  create: (body: Partial<Contact>) => http.post<Contact>("/contacts", body),
  update: (id: string, body: Partial<Contact>) => http.patch<Contact>(`/contacts/${id}`, body),
  remove: (id: string) => http.del<null>(`/contacts/${id}`),
  import: (rows: Partial<Contact>[]) =>
    http.post<{ imported: number; skipped: number }>("/contacts/import", { contacts: rows }),
};

export const users = {
  list: () => http.get<Listed<User>>("/users"),
  create: (body: { name: string; email: string; password: string; role?: string }) =>
    http.post<User>("/users", body),
  update: (id: string, body: Partial<Pick<User, "name" | "role" | "isActive">>) =>
    http.patch<User>(`/users/${id}`, body),
  remove: (id: string) => http.del<null>(`/users/${id}`),
};

export const queues = {
  list: () => http.get<Listed<Queue>>("/queues"),
  create: (body: Partial<Queue>) => http.post<Queue>("/queues", body),
  update: (id: string, body: Partial<Queue>) => http.patch<Queue>(`/queues/${id}`, body),
  remove: (id: string) => http.del<null>(`/queues/${id}`),
  setMembers: (id: string, userIds: string[]) =>
    http.put<{ queueId: string; memberIds: string[] }>(`/queues/${id}/members`, { userIds }),
};

export const quickReplies = {
  list: () => http.get<Listed<QuickReply>>("/quick-replies"),
  create: (body: { shortcut: string; message: string }) =>
    http.post<QuickReply>("/quick-replies", body),
  update: (id: string, body: Partial<QuickReply>) =>
    http.patch<QuickReply>(`/quick-replies/${id}`, body),
  remove: (id: string) => http.del<null>(`/quick-replies/${id}`),
};

export const tags = {
  list: () => http.get<Listed<Tag>>("/tags"),
  create: (body: { name: string; color?: string }) => http.post<Tag>("/tags", body),
  update: (id: string, body: Partial<Tag>) => http.patch<Tag>(`/tags/${id}`, body),
  remove: (id: string) => http.del<null>(`/tags/${id}`),
};

export const channels = {
  list: () => http.get<ChannelsResponse>("/channels"),
  create: (type: string, name?: string) => http.post<Channel>("/channels", { type, name }),
  update: (id: string, body: Record<string, unknown>) =>
    http.patch<Channel>(`/channels/${id}`, body),
  remove: (id: string) => http.del<null>(`/channels/${id}`),
  connect: (id: string) => http.post<ChannelLiveStatus>(`/channels/${id}/connect`),
  status: (id: string) => http.get<ChannelLiveStatus>(`/channels/${id}/status`),
  disconnect: (id: string) => http.post<ChannelLiveStatus>(`/channels/${id}/disconnect`),
  syncContacts: (id: string) =>
    http.post<{ imported: number; skipped: number }>(`/channels/${id}/sync-contacts`),
};

export const automations = {
  list: () => http.get<Listed<Automation>>("/automations"),
  create: (body: Partial<Automation>) => http.post<Automation>("/automations", body),
  update: (id: string, body: Partial<Automation>) =>
    http.patch<Automation>(`/automations/${id}`, body),
  remove: (id: string) => http.del<null>(`/automations/${id}`),
};

export const courses = {
  list: () => http.get<Listed<Course>>("/courses"),
  get: (id: string) => http.get<Course>(`/courses/${id}`),
  create: (body: Partial<Course>) => http.post<Course>("/courses", body),
  update: (id: string, body: Partial<Course>) => http.patch<Course>(`/courses/${id}`, body),
  remove: (id: string) => http.del<null>(`/courses/${id}`),
  addLesson: (courseId: string, body: Partial<Lesson>) =>
    http.post<Lesson>(`/courses/${courseId}/lessons`, body),
  updateLesson: (id: string, body: Partial<Lesson>) => http.patch<Lesson>(`/lessons/${id}`, body),
  removeLesson: (id: string) => http.del<null>(`/lessons/${id}`),
};

/** `/campaigns` devolve, junto da lista, o tamanho estimado de cada público
 *  para o formulário mostrar quantos contatos serão atingidos. */
export interface CampaignAudience {
  totalWithPhone: number;
  tags: Record<string, number>;
}

export const campaigns = {
  list: () => http.get<Listed<Campaign> & { audience: CampaignAudience }>("/campaigns"),
  get: (id: string) => http.get<Campaign>(`/campaigns/${id}`),
  create: (body: Record<string, unknown>) => http.post<Campaign>("/campaigns", body),
  send: (id: string) => http.post<Campaign>(`/campaigns/${id}/send`),
  cancel: (id: string) => http.post<Campaign>(`/campaigns/${id}/cancel`),
  remove: (id: string) => http.del<null>(`/campaigns/${id}`),
};

export const team = {
  messages: (after?: string) => http.get<Listed<TeamMessage>>(`/team/messages${qs({ after })}`),
  send: (body: string) => http.post<TeamMessage>("/team/messages", { body }),
};

export const settings = {
  get: () => http.get<{ settings: CompanySettings }>("/settings"),
  update: (body: CompanySettings) => http.put<{ settings: CompanySettings }>("/settings", body),
};

export const ratings = {
  list: () => http.get<Listed<Rating> & { metrics: RatingMetrics }>("/ratings"),
};

export const apiKeys = {
  list: () => http.get<Listed<ApiKey>>("/api-keys"),
  create: (name: string) => http.post<ApiKeyCreated>("/api-keys", { name }),
  revoke: (id: string) => http.del<null>(`/api-keys/${id}`),
};

export const webhooks = {
  list: () => http.get<Listed<Webhook> & { availableEvents: WebhookEvent[] }>("/webhooks"),
  create: (url: string, events: WebhookEvent[]) =>
    http.post<WebhookCreated>("/webhooks", { url, events }),
  remove: (id: string) => http.del<null>(`/webhooks/${id}`),
  deliveries: (id: string) => http.get<Listed<WebhookDelivery>>(`/webhooks/${id}/deliveries`),
};
