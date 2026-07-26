import type {
  AutomationType,
  CampaignStatus,
  ChannelStatus,
  ChannelType,
  ConversationStatus,
  CourseLevel,
  MessageDirection,
  MessageStatus,
  UserRole,
} from "./enums.js";

/**
 * Formas que a API devolve ao painel.
 *
 * Modelado a partir dos `select` de cada módulo de rota, não a partir do schema
 * do banco: várias rotas projetam só um subconjunto das colunas (`/users` não
 * devolve `passwordHash`, `/conversations` devolve o contato aninhado e achata
 * as tags), e é essa forma que o painel consome.
 *
 * Datas chegam como string ISO — passaram por JSON.
 */

export type Iso = string;

/** Envelope de lista paginada (`lib/http.ts` → `paginated`). */
export interface Paginated<T> {
  data: T[];
  meta: { page: number; perPage: number; total: number };
}

/** Envelope de lista simples, sem paginação. */
export interface Listed<T> {
  data: T[];
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string[];
  createdAt: Iso;
}

export interface ConversationTag {
  id: string;
  name: string;
  color: string;
}

/** Item da lista `/conversations`: contato aninhado, sem as mensagens. */
export interface ConversationListItem {
  id: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt: Iso | null;
  createdAt: Iso;
  contact: { id: string; name: string; phone: string | null };
  assignedUserId: string | null;
  channelId: string | null;
  queueId: string | null;
  tags: ConversationTag[];
}

export interface Message {
  id: string;
  companyId: string;
  conversationId: string;
  direction: MessageDirection;
  authorUserId: string | null;
  contentType: string;
  body: string;
  status: MessageStatus;
  createdAt: Iso;
}

/** `/conversations/:id`: a linha inteira mais contato, mensagens e tags. */
export interface ConversationDetail {
  id: string;
  companyId: string;
  contactId: string;
  channelId: string | null;
  queueId: string | null;
  status: ConversationStatus;
  assignedUserId: string | null;
  botActive: boolean;
  awaitingRatingAt: Iso | null;
  unreadCount: number;
  lastMessageAt: Iso | null;
  firstResponseAt: Iso | null;
  createdAt: Iso;
  contact: Contact;
  messages: Message[];
  tags: ConversationTag[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Iso | null;
  createdAt: Iso;
}

export interface QueueSchedule {
  enabled?: boolean;
  /** Dias da semana, 1 = segunda … 7 = domingo. */
  days?: number[];
  /** "HH:MM" */
  start?: string;
  /** "HH:MM" */
  end?: string;
  message?: string;
}

export interface Queue {
  id: string;
  companyId: string;
  name: string;
  color: string;
  orderIndex: number;
  schedule: QueueSchedule;
  createdAt: Iso;
  memberIds: string[];
  /** Calculado no servidor a partir de `schedule` e do horário atual. */
  isOpen: boolean;
}

export interface QuickReply {
  id: string;
  companyId: string;
  shortcut: string;
  message: string;
  createdAt: Iso;
}

export interface Tag {
  id: string;
  companyId: string;
  name: string;
  color: string;
  createdAt: Iso;
}

/** `/conversations/:id/notes` projeta só estes campos e chama o nome do autor
 *  de `author` (vem de um left join com users, então pode ser null). */
export interface ConversationNote {
  id: string;
  body: string;
  createdAt: Iso;
  author: string | null;
}

export interface TeamMessage {
  id: string;
  body: string;
  createdAt: Iso;
  userId: string | null;
  userName: string | null;
}

/** Estado ao vivo da sessão de um canal (o WhatsApp mantém sessão viva; os
 *  demais refletem o que está no banco). */
export interface ChannelLiveStatus {
  status: ChannelStatus;
  qr?: string | null;
  phone?: string | null;
  /** true quando o WhatsApp roda sem a lib Baileys (pareamento simulado). */
  demo?: boolean;
  contactsAvailable?: number;
  note?: string;
  error?: string;
}

/** Resultado de /channels/:id/sync-contacts (importa a agenda do aparelho). */
export interface SyncContactsResult {
  ok: boolean;
  imported: number;
  skipped: number;
  total: number;
  error?: string;
}

export interface Channel {
  id: string;
  companyId: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  config: Record<string, unknown>;
  createdAt: Iso;
  live?: ChannelLiveStatus;
}

export interface ChannelCatalogEntry {
  type: ChannelType;
  label: string;
  icon: string;
  real: boolean;
  help: string;
}

export interface ChannelsResponse {
  data: Channel[];
  catalog: ChannelCatalogEntry[];
}

export interface Automation {
  id: string;
  companyId: string;
  name: string;
  type: AutomationType;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: Iso;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  videoUrl: string;
  content: string;
  durationMin: number;
  position: number;
  createdAt: Iso;
}

export interface Course {
  id: string;
  companyId: string;
  title: string;
  description: string;
  emoji: string;
  level: CourseLevel;
  isPublished: boolean;
  position: number;
  createdAt: Iso;
  /** `/courses` devolve só a contagem; `/courses/:id` devolve as aulas. */
  lessonCount?: number;
  lessons?: Lesson[];
}

export interface Campaign {
  id: string;
  companyId: string;
  name: string;
  message: string;
  status: CampaignStatus;
  filterTag: string | null;
  scheduledAt: Iso | null;
  startedAt: Iso | null;
  finishedAt: Iso | null;
  total: number;
  sent: number;
  failed: number;
  createdByUserId: string | null;
  createdAt: Iso;
}

export interface RatingMetrics {
  count: number;
  average: number | null;
  nps: number | null;
}

export interface DashboardMetrics {
  conversations: { pending: number; open: number; resolved: number };
  messagesToday: number;
  contacts: number;
  avgFirstResponseSeconds: number | null;
  messages7d: { day: string; count: number }[];
  byQueue: { name: string; color: string; count: number }[];
  rating: RatingMetrics;
}

/** Configurações gerais da empresa (base de conhecimento do widget, etc.). */
export type CompanySettings = Record<string, unknown>;
