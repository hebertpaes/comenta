#!/usr/bin/env node
// =============================================================
// ghost-settings.mjs — lê e altera configurações do site no Ghost
// (Admin API /settings/), para o que a interface pede upload manual:
// capa da publicação (cover_image), logo, ícone, descrição, etc.
// =============================================================
//
//   node ghost-settings.mjs                          lista as configurações de marca
//   node ghost-settings.mjs --get=cover_image
//   node ghost-settings.mjs --set cover_image=https://hojemt.com.br/content/images/2026/09/capa.png
//   node ghost-settings.mjs --set cover_image=@pautas/capa.png   (sobe o arquivo antes)
//   node ghost-settings.mjs --set description="O jornal de Mato Grosso e do Brasil"
//
// Env: GHOST_ADMIN_URL, GHOST_ADMIN_API_KEY (id:secret).
import { createHmac } from "node:crypto";
import { ghostClient } from "./lib/ghost.mjs";

const URL_ADMIN = (process.env.GHOST_ADMIN_URL || "").replace(/\/+$/, "");
const CHAVE = process.env.GHOST_ADMIN_API_KEY || "";
if (!URL_ADMIN || !CHAVE.includes(":")) {
  console.error("ERRO: defina GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY (id:secret).");
  process.exit(1);
}

/** Token JWT da Admin API (5 min), como o SDK oficial faz. */
function token() {
  const [id, secret] = CHAVE.split(":");
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = b64({ alg: "HS256", typ: "JWT", kid: id });
  const corpo = b64({ iat: agora, exp: agora + 300, aud: "/admin/" });
  const assinatura = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(`${cabecalho}.${corpo}`)
    .digest("base64url");
  return `${cabecalho}.${corpo}.${assinatura}`;
}

async function admin(caminho, { method = "GET", body } = {}) {
  const r = await fetch(`${URL_ADMIN}/ghost/api/admin/${caminho}`, {
    method,
    headers: {
      Authorization: `Ghost ${token()}`,
      "Accept-Version": "v6.0",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${caminho}: ${j.errors?.[0]?.message || r.status}`);
  return j;
}

const args = process.argv.slice(2);
const get = args.find((a) => a.startsWith("--get="))?.slice(6);
const iSet = args.indexOf("--set");
const sets = iSet >= 0 ? args.slice(iSet + 1).filter((a) => a.includes("=")) : [];

if (!sets.length) {
  const { settings } = await admin("settings/");
  const marca = new Set([
    "title", "description", "logo", "icon", "cover_image", "accent_color", "lang", "timezone",
    "meta_title", "meta_description", "og_image", "twitter_image",
  ]);
  for (const s of settings) {
    if (get ? s.key === get : marca.has(s.key)) console.log(`${s.key}: ${s.value ?? "(vazio)"}`);
  }
  process.exit(0);
}

const api = ghostClient();
const novos = [];
for (const par of sets) {
  const i = par.indexOf("=");
  const key = par.slice(0, i);
  let value = par.slice(i + 1);
  if (value.startsWith("@")) {
    const enviado = await api.images.upload({ file: value.slice(1), purpose: "image" });
    if (!enviado?.url) throw new Error(`upload sem url: ${value}`);
    console.log(`enviado: ${value.slice(1)} -> ${enviado.url}`);
    value = enviado.url;
  }
  novos.push({ key, value });
}
const { settings } = await admin("settings/", { method: "PUT", body: { settings: novos } });
for (const n of novos) {
  const s = settings.find((x) => x.key === n.key);
  console.log(`${n.key}: ${s ? s.value : "(não retornado)"}`);
}
