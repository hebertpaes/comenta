export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
}

export const STATUS_META: Record<string, StatusMeta> = {
  connected: { label: "Conectado", color: "#22c55e", bg: "#dcfce7" },
  connecting: { label: "Conectando…", color: "#d97706", bg: "#fef3c7" },
  configured: { label: "Configurado", color: "#2563eb", bg: "#dbeafe" },
  disconnected: { label: "Desconectado", color: "#64748b", bg: "#f1f5f9" },
};

export function metaFor(status: string | undefined): StatusMeta {
  return STATUS_META[status ?? ""] ?? (STATUS_META.disconnected as StatusMeta);
}

/** Campos de configuração por tipo de canal (em vez de JSON cru). */
export interface ChannelField {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
}

export const CHANNEL_FIELDS: Record<string, ChannelField[]> = {
  telegram: [
    { key: "botToken", label: "Bot Token (@BotFather)", placeholder: "123456:ABC-DEF..." },
  ],
  instagram: [
    { key: "accessToken", label: "Access Token (Meta)", placeholder: "EAAB..." },
    { key: "igBusinessId", label: "Instagram Business ID", placeholder: "1784XXXXXXXX" },
  ],
  facebook: [
    { key: "pageAccessToken", label: "Page Access Token", placeholder: "EAAB..." },
    { key: "pageId", label: "Page ID", placeholder: "1029XXXXXXXX" },
  ],
  email: [
    { key: "imapHost", label: "IMAP host", placeholder: "imap.gmail.com" },
    { key: "imapPort", label: "IMAP porta", placeholder: "993" },
    { key: "user", label: "Usuário / E-mail", placeholder: "voce@empresa.com" },
    { key: "password", label: "Senha", type: "password", placeholder: "••••••••" },
    { key: "smtpHost", label: "SMTP host", placeholder: "smtp.gmail.com" },
    { key: "smtpPort", label: "SMTP porta", placeholder: "587" },
  ],
};
