#!/usr/bin/env node
// =============================================================
// ghost-api.mjs — cliente mínimo do Ghost Admin API, sem dependência
// =============================================================
// O @tryghost/admin-api não cobre export/import do banco, e no servidor não há
// node_modules instalado. Aqui vai só o necessário, com Node puro:
//
//   node ghost-api.mjs export <arquivo.json>      salva o conteúdo atual
//   node ghost-api.mjs import <arquivo.json>      importa (o Ghost mescla por slug)
//   node ghost-api.mjs upload-theme <tema.zip>    envia o tema
//   node ghost-api.mjs activate-theme <nome>      ativa o tema
//   node ghost-api.mjs info                       site, versão e nº de posts
//
// Variáveis:
//   GHOST_ADMIN_URL       default http://127.0.0.1:2368
//   GHOST_ADMIN_API_KEY   id:secret (Ghost → Settings → Integrations → Custom)
import { createHmac } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const URL_BASE = (process.env.GHOST_ADMIN_URL || "http://127.0.0.1:2368").replace(/\/+$/, "");
const KEY = process.env.GHOST_ADMIN_API_KEY || "";

function morre(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

/**
 * Token do Admin API: JWT HS256 assinado com o secret em hexadecimal (não em
 * texto), `kid` = id da chave e `aud` = "/admin/". Vale 5 minutos.
 */
export function token(chave = KEY) {
  const [id, secret] = chave.split(":");
  if (!id || !secret) morre("GHOST_ADMIN_API_KEY no formato id:secret é obrigatória.");
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const agora = Math.floor(Date.now() / 1000);
  const corpo = `${b64({ alg: "HS256", typ: "JWT", kid: id })}.${b64({ iat: agora, exp: agora + 300, aud: "/admin/" })}`;
  const assinatura = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(corpo)
    .digest("base64url");
  return `${corpo}.${assinatura}`;
}

async function chama(caminho, opcoes = {}) {
  const resposta = await fetch(`${URL_BASE}/ghost/api/admin/${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Ghost ${token()}`,
      "Accept-Version": "v5.0",
      ...(opcoes.headers || {}),
    },
  });
  const texto = await resposta.text();
  if (!resposta.ok) {
    // O Ghost devolve os erros em JSON; mostrar a mensagem dele ajuda muito
    // mais do que só o código HTTP.
    let detalhe = texto.slice(0, 400);
    try {
      const j = JSON.parse(texto);
      detalhe =
        (j.errors || [])
          .map((e) => `${e.message}${e.context ? ` — ${e.context}` : ""}`)
          .join("; ") || detalhe;
    } catch {
      /* resposta não-JSON: fica o texto cru mesmo */
    }
    morre(`${opcoes.method || "GET"} ${caminho} → ${resposta.status}: ${detalhe}`);
  }
  return texto;
}

/** multipart/form-data com um arquivo só, via FormData nativo do Node 18+. */
async function enviaArquivo(caminho, campo, arquivo, tipo) {
  const form = new FormData();
  form.append(campo, new Blob([await readFile(arquivo)], { type: tipo }), basename(arquivo));
  return chama(caminho, { method: "POST", body: form });
}

const [comando, argumento] = process.argv.slice(2);

switch (comando) {
  case "info": {
    const site = JSON.parse(await chama("site/"))?.site || {};
    const posts =
      JSON.parse(await chama("posts/?limit=1&fields=id"))?.meta?.pagination?.total ?? "?";
    console.log(`${site.title || "(sem título)"} — ${site.url || URL_BASE}`);
    console.log(`Ghost ${site.version || "?"} · ${posts} post(s) publicados/rascunho`);
    break;
  }
  case "export": {
    if (!argumento) morre("uso: export <arquivo.json>");
    await writeFile(argumento, await chama("db/"));
    console.log(`conteúdo atual salvo em ${argumento}`);
    break;
  }
  case "import": {
    if (!argumento) morre("uso: import <arquivo.json>");
    // Confere o formato antes de mandar: um JSON fora do padrão do Ghost
    // devolve um erro genérico e some com a causa.
    const dados = JSON.parse(await readFile(argumento, "utf8"));
    const no = dados?.db?.[0];
    if (!no?.data)
      morre(`${argumento} não parece um export do Ghost (esperado {"db":[{"data":{...}}]}).`);
    const tabelas = Object.entries(no.data)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => `${k}: ${v.length}`)
      .join(", ");
    console.log(`importando ${argumento} (${tabelas})`);
    const r = JSON.parse(await enviaArquivo("db/", "importfile", argumento, "application/json"));
    const problemas = r?.db?.[0]?.problems || r?.problems || [];
    console.log(problemas.length ? `importado com ${problemas.length} aviso(s):` : "importado.");
    for (const p of problemas.slice(0, 10)) console.log(`  - ${p.message || JSON.stringify(p)}`);
    break;
  }
  case "upload-theme": {
    if (!argumento) morre("uso: upload-theme <tema.zip>");
    const r = JSON.parse(
      await enviaArquivo("themes/upload/", "file", argumento, "application/zip")
    );
    const tema = r?.themes?.[0] || {};
    const avisos = tema.warnings || tema.errors || [];
    console.log(
      `tema enviado: ${tema.name || "?"}${avisos.length ? ` (${avisos.length} aviso(s) do gscan)` : ""}`
    );
    for (const a of avisos.slice(0, 5))
      console.log(`  - ${a.rule || a.message || JSON.stringify(a).slice(0, 120)}`);
    break;
  }
  case "activate-theme": {
    if (!argumento) morre("uso: activate-theme <nome>");
    await chama(`themes/${encodeURIComponent(argumento)}/activate/`, { method: "PUT" });
    console.log(`tema ativo: ${argumento}`);
    break;
  }
  default:
    console.log(
      "uso: ghost-api.mjs info | export <f> | import <f> | upload-theme <zip> | activate-theme <nome>"
    );
    process.exit(comando ? 1 : 0);
}
