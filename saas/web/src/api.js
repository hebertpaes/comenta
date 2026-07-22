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
  conversations: (status) => req("GET", `/conversations${status ? `?status=${status}` : ""}`),
  conversation: (id) => req("GET", `/conversations/${id}`),
  sendMessage: (id, body) => req("POST", `/conversations/${id}/messages`, { body }),
  contacts: () => req("GET", "/contacts"),
  aiClassify: (id) => req("POST", `/conversations/${id}/ai/classify`),
  aiSummary: (id) => req("POST", `/conversations/${id}/ai/summary`),
  aiSuggest: (id) => req("POST", `/conversations/${id}/ai/suggest`),
  channels: () => req("GET", "/channels"),
  waConnect: () => req("POST", "/channels/whatsapp/connect"),
  waStatus: () => req("GET", "/channels/whatsapp/status"),
  waDisconnect: () => req("POST", "/channels/whatsapp/disconnect"),
  automations: () => req("GET", "/automations"),
  automationCreate: (body) => req("POST", "/automations", body),
  automationUpdate: (id, body) => req("PATCH", `/automations/${id}`, body),
  automationDelete: (id) => req("DELETE", `/automations/${id}`),
};
