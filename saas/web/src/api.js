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

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
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
  logout: () => setTokens("", ""),
  me: () => req("GET", "/auth/me"),
  metrics: () => req("GET", "/dashboard/metrics"),
  conversations: (opts = {}) => {
    const qs = new URLSearchParams();
    if (typeof opts === "string") { if (opts) qs.set("status", opts); }
    else { if (opts.status) qs.set("status", opts.status); if (opts.queueId) qs.set("queueId", opts.queueId); }
    const s = qs.toString();
    return req("GET", `/conversations${s ? `?${s}` : ""}`);
  },
  conversation: (id) => req("GET", `/conversations/${id}`),
  sendMessage: (id, body) => req("POST", `/conversations/${id}/messages`, { body }),
  conversationUpdate: (id, body) => req("PATCH", `/conversations/${id}`, body),
  contacts: () => req("GET", "/contacts"),
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
};
