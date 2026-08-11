import { z } from "zod";

/**
 * Enums do domínio.
 *
 * Antes estes valores viviam em três lugares desconectados: comentários ao lado
 * das colunas `varchar` no schema Drizzle, literais soltos nos `z.enum(...)` de
 * cada módulo de rota, e strings cruas no painel. Já haviam divergido — o
 * comentário de `automations.type` no schema listava três tipos enquanto o
 * módulo aceitava cinco. Aqui é a fonte única.
 */

export const PLAN_IDS = ["free", "pro", "business"] as const;
export const PlanId = z.enum(PLAN_IDS);
export type PlanId = z.infer<typeof PlanId>;

export const COMPANY_STATUSES = ["active", "suspended"] as const;
export const CompanyStatus = z.enum(COMPANY_STATUSES);
export type CompanyStatus = z.infer<typeof CompanyStatus>;

export const USER_ROLES = ["admin", "agent"] as const;
export const UserRole = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRole>;

/** Papel de quem fez a chamada. Além dos papéis de usuário existe `api`, usado
 *  quando a autenticação veio de uma API key em vez de uma sessão — e que o
 *  `requireAdmin` trata como administrador. */
export const PRINCIPAL_ROLES = ["admin", "agent", "api"] as const;
export const PrincipalRole = z.enum(PRINCIPAL_ROLES);
export type PrincipalRole = z.infer<typeof PrincipalRole>;

/** Catálogo de canais oferecidos pelo painel. `real` distingue as integrações
 *  que já entregam mensagem das que só têm o encaixe pronto. */
export const CHANNEL_CATALOG = [
  { type: "whatsapp", label: "WhatsApp", icon: "🟢", real: true },
  { type: "instagram", label: "Instagram Direct", icon: "📸", real: true },
  { type: "facebook", label: "Facebook Messenger", icon: "💬", real: true },
  { type: "youtube", label: "YouTube", icon: "▶️", real: true },
  { type: "x", label: "X (Twitter)", icon: "𝕏", real: true },
  { type: "telegram", label: "Telegram", icon: "✈️", real: false },
  { type: "widget", label: "Widget do site", icon: "🌐", real: true },
  { type: "email", label: "E-mail", icon: "✉️", real: false },
] as const;

export const CHANNEL_TYPES = [
  "whatsapp",
  "instagram",
  "facebook",
  "youtube",
  "x",
  "telegram",
  "widget",
  "email",
] as const;
export const ChannelType = z.enum(CHANNEL_TYPES);
export type ChannelType = z.infer<typeof ChannelType>;

/** Inclui `configured`: o comentário da coluna no schema listava só três
 *  valores, mas modules/channels.ts grava "configured" no banco quando um canal
 *  sem integração real recebe credenciais. */
export const CHANNEL_STATUSES = ["connected", "connecting", "configured", "disconnected"] as const;
export const ChannelStatus = z.enum(CHANNEL_STATUSES);
export type ChannelStatus = z.infer<typeof ChannelStatus>;

export const CONVERSATION_STATUSES = ["pending", "open", "resolved"] as const;
export const ConversationStatus = z.enum(CONVERSATION_STATUSES);
export type ConversationStatus = z.infer<typeof ConversationStatus>;

export const MESSAGE_DIRECTIONS = ["in", "out"] as const;
export const MessageDirection = z.enum(MESSAGE_DIRECTIONS);
export type MessageDirection = z.infer<typeof MessageDirection>;

export const MESSAGE_STATUSES = ["sent", "delivered", "read", "failed"] as const;
export const MessageStatus = z.enum(MESSAGE_STATUSES);
export type MessageStatus = z.infer<typeof MessageStatus>;

/** Inclui `ai` e `rating`, que existem em modules/automations.ts mas faltavam
 *  no comentário do schema. */
export const AUTOMATION_TYPES = ["welcome", "business_hours", "keyword", "ai", "rating"] as const;
export const AutomationType = z.enum(AUTOMATION_TYPES);
export type AutomationType = z.infer<typeof AutomationType>;

export const COURSE_LEVELS = ["iniciante", "intermediario", "avancado"] as const;
export const CourseLevel = z.enum(COURSE_LEVELS);
export type CourseLevel = z.infer<typeof CourseLevel>;

export const CAMPAIGN_STATUSES = ["draft", "scheduled", "running", "done", "canceled"] as const;
export const CampaignStatus = z.enum(CAMPAIGN_STATUSES);
export type CampaignStatus = z.infer<typeof CampaignStatus>;

export const CAMPAIGN_RECIPIENT_STATUSES = ["pending", "sent", "failed"] as const;
export const CampaignRecipientStatus = z.enum(CAMPAIGN_RECIPIENT_STATUSES);
export type CampaignRecipientStatus = z.infer<typeof CampaignRecipientStatus>;

export const CAMPAIGN_AUDIENCES = ["all", "tag", "contacts"] as const;
export const CampaignAudience = z.enum(CAMPAIGN_AUDIENCES);
export type CampaignAudience = z.infer<typeof CampaignAudience>;

export const WEBHOOK_EVENTS = [
  "conversation.created",
  "message.created",
  "conversation.updated",
] as const;
export const WebhookEvent = z.enum(WEBHOOK_EVENTS);
export type WebhookEvent = z.infer<typeof WebhookEvent>;

export const WEBHOOK_DELIVERY_STATUSES = ["pending", "success", "failed"] as const;
export const WebhookDeliveryStatus = z.enum(WEBHOOK_DELIVERY_STATUSES);
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatus>;
