// Cliente HTTP mínimo para a API do Comenta.
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let accessToken = localStorage.getItem("comenta_token") || "";
let refreshToken = localStorage.getItem("comenta_refresh") || "";

export function setTokens(access, refresh) {
  accessToken = access || "";
  refreshToken = refresh || "";
  if (access) localStorage.setItem("comenta_token", access);
  else localStorage.removeItem("comenta_token");
  if (refresh) localStorage.setItem("comenta_refresh", refresh);
  else localStorage.removeItem("comenta_refresh");
}

export const isLoggedIn = () => Boolean(accessToken);

function send(method, path, body) {
  return fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// O access token dura 15 minutos (ACCESS_TOKEN_TTL na API). Sem renovar, toda
// requisição passa a falhar com 401 depois desse tempo e o usuário é obrigado a
// deslogar e logar de novo — era o que acontecia: o refresh token era guardado
// no localStorage e nunca usado.
//
// Uma renovação de cada vez: se várias requisições tomarem 401 juntas, todas
// esperam a mesma promessa em vez de disparar refreshes concorrentes (que
// falhariam, porque o endpoint rotaciona e invalida o token anterior).
let refreshing = null;

async function refreshAccessToken() {
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(BASE + "/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function req(method, path, body) {
  let res = await send(method, path, body);

  // 401 em rota de auth não é sessão expirada, é credencial errada: não adianta
  // renovar.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (await refreshAccessToken()) {
      res = await send(method, path, body);
    } else {
      setTokens("", "");
    }
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

export const api = {
  login: async (email, password) => {
    const r = await req("POST", "/auth/login", { email, password });
    setTokens(r.accessToken, r.refreshToken);
    return r;
  },
  signup: async (companyName, name, email, password) => {
    const r = await req("POST", "/auth/signup", { companyName, name, email, password });
    setTokens(r.accessToken, r.refreshToken);
    return r;
  },
  // Revoga o refresh token no servidor antes de limpar o local: sem isso ele
  // seguia válido por 30 dias (REFRESH_TOKEN_TTL_DAYS) mesmo depois de "sair".
  logout: () => {
    const token = refreshToken;
    setTokens("", "");
    if (token) {
      fetch(BASE + "/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: token }),
      }).catch(() => {
        // Best-effort: a sessão local já foi encerrada de qualquer forma.
      });
    }
  },
  me: () => req("GET", "/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    req("POST", "/auth/change-password", { currentPassword, newPassword }),
  metrics: () => req("GET", "/dashboard/metrics"),
  conversations: (opts = {}) => {
    const qs = new URLSearchParams();
    if (typeof opts === "string") {
      if (opts) qs.set("status", opts);
    } else {
      if (opts.status) qs.set("status", opts.status);
      if (opts.queueId) qs.set("queueId", opts.queueId);
    }
    const s = qs.toString();
    return req("GET", `/conversations${s ? `?${s}` : ""}`);
  },
  conversation: (id) => req("GET", `/conversations/${id}`),
  sendMessage: (id, body) => req("POST", `/conversations/${id}/messages`, { body }),
  conversationUpdate: (id, body) => req("PATCH", `/conversations/${id}`, body),
  contacts: (q) =>
    req("GET", `/contacts${q ? `?q=${encodeURIComponent(q)}&perPage=100` : "?perPage=100"}`),
  contactCreate: (body) => req("POST", "/contacts", body),
  contactUpdate: (id, body) => req("PATCH", `/contacts/${id}`, body),
  contactDelete: (id) => req("DELETE", `/contacts/${id}`),
  contactsImport: (contacts) => req("POST", "/contacts/import", { contacts }),
  userCreate: (body) => req("POST", "/users", body),
  userUpdate: (id, body) => req("PATCH", `/users/${id}`, body),
  userDelete: (id) => req("DELETE", `/users/${id}`),
  aiClassify: (id) => req("POST", `/conversations/${id}/ai/classify`),
  aiSummary: (id) => req("POST", `/conversations/${id}/ai/summary`),
  aiSuggest: (id) => req("POST", `/conversations/${id}/ai/suggest`),
  channels: () => req("GET", "/channels"),
  channelCreate: (type, name) => req("POST", "/channels", { type, name }),
  channelUpdate: (id, body) => req("PATCH", `/channels/${id}`, body),
  channelDelete: (id) => req("DELETE", `/channels/${id}`),
  channelConnect: (id) => req("POST", `/channels/${id}/connect`),
  channelStatus: (id) => req("GET", `/channels/${id}/status`),
  channelDisconnect: (id) => req("POST", `/channels/${id}/disconnect`),
  channelSyncContacts: (id) => req("POST", `/channels/${id}/sync-contacts`),
  campaigns: () => req("GET", "/campaigns"),
  campaign: (id) => req("GET", `/campaigns/${id}`),
  campaignCreate: (body) => req("POST", "/campaigns", body),
  campaignSend: (id) => req("POST", `/campaigns/${id}/send`),
  campaignCancel: (id) => req("POST", `/campaigns/${id}/cancel`),
  campaignDelete: (id) => req("DELETE", `/campaigns/${id}`),
  teamMessages: (after) =>
    req("GET", `/team/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`),
  teamSend: (body) => req("POST", "/team/messages", { body }),
  settings: () => req("GET", "/settings"),
  settingsUpdate: (body) => req("PUT", "/settings", body),
  automations: () => req("GET", "/automations"),
  automationCreate: (body) => req("POST", "/automations", body),
  automationUpdate: (id, body) => req("PATCH", `/automations/${id}`, body),
  automationDelete: (id) => req("DELETE", `/automations/${id}`),
  courses: () => req("GET", "/courses"),
  course: (id) => req("GET", `/courses/${id}`),
  courseCreate: (body) => req("POST", "/courses", body),
  courseUpdate: (id, body) => req("PATCH", `/courses/${id}`, body),
  courseDelete: (id) => req("DELETE", `/courses/${id}`),
  lessonCreate: (courseId, body) => req("POST", `/courses/${courseId}/lessons`, body),
  lessonUpdate: (id, body) => req("PATCH", `/lessons/${id}`, body),
  lessonDelete: (id) => req("DELETE", `/lessons/${id}`),
  users: () => req("GET", "/users"),
  queues: () => req("GET", "/queues"),
  queueCreate: (body) => req("POST", "/queues", body),
  queueUpdate: (id, body) => req("PATCH", `/queues/${id}`, body),
  queueDelete: (id) => req("DELETE", `/queues/${id}`),
  queueSetMembers: (id, userIds) => req("PUT", `/queues/${id}/members`, { userIds }),
  quickReplies: () => req("GET", "/quick-replies"),
  quickReplyCreate: (body) => req("POST", "/quick-replies", body),
  quickReplyUpdate: (id, body) => req("PATCH", `/quick-replies/${id}`, body),
  quickReplyDelete: (id) => req("DELETE", `/quick-replies/${id}`),
  tags: () => req("GET", "/tags"),
  tagCreate: (body) => req("POST", "/tags", body),
  tagUpdate: (id, body) => req("PATCH", `/tags/${id}`, body),
  tagDelete: (id) => req("DELETE", `/tags/${id}`),
  conversationSetTags: (id, tagIds) => req("PUT", `/conversations/${id}/tags`, { tagIds }),
  notes: (id) => req("GET", `/conversations/${id}/notes`),
  noteCreate: (id, body) => req("POST", `/conversations/${id}/notes`, { body }),
  noteDelete: (id) => req("DELETE", `/notes/${id}`),
};
