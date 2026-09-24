// Acesso "cru" à Admin API do Ghost (rotas que o SDK não cobre bem: settings, themes…).
// Env: GHOST_ADMIN_URL, GHOST_ADMIN_API_KEY (id:secret).
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const URL_ADMIN = (process.env.GHOST_ADMIN_URL || "").replace(/\/+$/, "");
const CHAVE = process.env.GHOST_ADMIN_API_KEY || "";

/** Token JWT de 5 min, como o SDK oficial faz. */
export function tokenAdmin() {
  if (!URL_ADMIN || !CHAVE.includes(":")) {
    throw new Error("defina GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY (id:secret)");
  }
  const [id, secret] = CHAVE.split(":");
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64({ alg: "HS256", typ: "JWT", kid: id });
  const corpo = b64({ iat: agora, exp: agora + 300, aud: "/admin/" });
  const ass = createHmac("sha256", Buffer.from(secret, "hex")).update(`${cab}.${corpo}`).digest("base64url");
  return `${cab}.${corpo}.${ass}`;
}

/** fetch autenticado; devolve Response (para JSON ou binário). */
export async function adminFetch(caminho, { method = "GET", body, headers = {} } = {}) {
  const r = await fetch(`${URL_ADMIN}/ghost/api/admin/${caminho.replace(/^\/+/, "")}`, {
    method,
    headers: { Authorization: `Ghost ${tokenAdmin()}`, "Accept-Version": "v6.0", ...headers },
    body,
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(`${method} ${caminho}: ${j.errors?.[0]?.message || r.status}`);
  }
  return r;
}

export async function adminJson(caminho, opts) {
  return (await adminFetch(caminho, opts)).json();
}

/** Envia um arquivo (multipart) — ex.: themes/upload/ com campo "file". */
export async function adminUpload(caminho, arquivo, campo = "file", tipo = "application/zip") {
  const fd = new FormData();
  fd.append(campo, new Blob([await readFile(arquivo)], { type: tipo }), basename(arquivo));
  return adminJson(caminho, { method: "POST", body: fd });
}
