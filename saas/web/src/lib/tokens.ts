/**
 * Guarda os tokens da sessão. Fica separado do cliente HTTP porque tanto o
 * cliente quanto o contexto de autenticação precisam ler/escrever daqui, e
 * porque assim dá para testar o armazenamento sem tocar em rede.
 */

const ACCESS_KEY = "comenta_token";
const REFRESH_KEY = "comenta_refresh";

// localStorage lança em navegação privada com storage bloqueado; nesse caso a
// sessão vale só enquanto a aba estiver aberta.
function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Sem storage: mantemos só na memória.
  }
}

let accessToken = read(ACCESS_KEY);
let refreshToken = read(REFRESH_KEY);

const listeners = new Set<() => void>();

export function getAccessToken(): string {
  return accessToken;
}

export function getRefreshToken(): string {
  return refreshToken;
}

export function setTokens(access: string, refresh: string): void {
  accessToken = access || "";
  refreshToken = refresh || "";
  write(ACCESS_KEY, accessToken);
  write(REFRESH_KEY, refreshToken);
  listeners.forEach((fn) => fn());
}

export function clearTokens(): void {
  setTokens("", "");
}

export function isLoggedIn(): boolean {
  return Boolean(accessToken);
}

/** Permite ao React reagir a uma sessão derrubada de dentro do cliente HTTP
 *  (por exemplo quando o refresh falha no meio de uma requisição qualquer). */
export function subscribeToTokens(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
