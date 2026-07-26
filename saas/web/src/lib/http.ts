import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./tokens";

export const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

/** Erro de API com o status preservado, para a UI distinguir 403 de 500. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

function send(method: Method, path: string, body?: unknown): Promise<Response> {
  const token = getAccessToken();
  return fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// O access token dura 15 minutos (ACCESS_TOKEN_TTL na API). Uma renovação de
// cada vez: se várias requisições tomarem 401 juntas, todas esperam a mesma
// promessa em vez de disparar refreshes concorrentes — o endpoint rotaciona o
// refresh token e invalida o anterior, então o segundo pedido falharia.
let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
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

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body);

  // 401 numa rota de auth não é sessão expirada, é credencial errada — renovar
  // não ajuda e ainda mascararia a mensagem de erro correta.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (await refreshAccessToken()) {
      res = await send(method, path, body);
    } else {
      clearTokens();
    }
  }

  if (res.status === 204) return null as T;

  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? `Erro ${res.status}`, data.code);
  }
  return data as T;
}

export const http = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

/** Monta querystring pulando valores vazios, para não gerar `?status=`. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
