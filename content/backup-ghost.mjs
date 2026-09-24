#!/usr/bin/env node
// =============================================================
// backup-ghost.mjs — exporta o conteúdo do Ghost (posts, páginas, tags,
// autores, configurações, newsletters) para JSON versionável no repositório,
// mais a lista de todas as imagens/mídias referenciadas (manifesto).
// =============================================================
//
//   node backup-ghost.mjs                     grava em ../backup/ghost/latest/ (histórico = commits no branch)
//   node backup-ghost.mjs --saida=dir         outra pasta
//   node backup-ghost.mjs --baixar=dir        também baixa as imagens/mídias do manifesto para dir/
//
// A chave de integração não tem acesso a db/ (export completo) nem a themes/;
// o tema fica versionado em ghost/content/themes/hojemt. Segredos das
// configurações (chaves, tokens, senhas) e e-mails de autores são removidos.
import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { adminJson } from "./lib/ghost-admin.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const hoje = new Date().toISOString().slice(0, 10);
const SAIDA = String(args.saida || join("..", "backup", "ghost", "latest")); // histórico = commits no branch
await mkdir(SAIDA, { recursive: true });

async function tudo(recurso, extra = "") {
  const itens = []; let page = 1, pages = 1;
  do {
    const r = await adminJson(`${recurso}/?limit=100&page=${page}${extra}`);
    itens.push(...(r[recurso] || [])); pages = r.meta?.pagination?.pages || 1; page++;
  } while (page <= pages);
  return itens;
}
const SEGREDO = /(key|secret|token|password|senha|api|smtp|mailgun)/i;

const posts = await tudo("posts", "&formats=lexical,html,plaintext&include=tags,authors&filter=status:[published,draft,scheduled]");
const pages = await tudo("pages", "&formats=lexical,html,plaintext&include=tags,authors&filter=status:[published,draft,scheduled]");
const tags = await tudo("tags");
const users = (await tudo("users", "&include=roles")).map(({ email, ...u }) => u);
const newsletters = await tudo("newsletters");
const settings = (await adminJson("settings/")).settings.filter((s) => !SEGREDO.test(s.key));
const site = (await adminJson("site/")).site;

const imagens = new Set();
const add = (u) => { if (u && /^https?:\/\//.test(u)) imagens.add(u); };
for (const p of [...posts, ...pages]) {
  add(p.feature_image); add(p.og_image); add(p.twitter_image);
  for (const m of (p.html || "").matchAll(/<(?:img|video|source)[^>]+(?:src|poster)="([^"]+)"/g)) add(m[1]);
  for (const m of (p.lexical || "").matchAll(/"(?:src|thumbnailSrc|customThumbnailSrc)":"([^"]+)"/g)) add(m[1].replace(/\\\//g, "/"));
}
for (const t of tags) add(t.feature_image);
for (const s of settings) if (/image|logo|icon|cover/.test(s.key)) add(s.value);

const grava = (nome, dados) => writeFile(join(SAIDA, nome), JSON.stringify(dados, null, 2) + "\n");
await grava("posts.json", posts); await grava("pages.json", pages); await grava("tags.json", tags);
await grava("users.json", users); await grava("newsletters.json", newsletters); await grava("settings.json", settings); await grava("site.json", site);
await writeFile(join(SAIDA, "imagens.txt"), [...imagens].sort().join("\n") + "\n");
await grava("resumo.json", { gerado_em: new Date().toISOString(), site: site.url, posts: posts.length, publicados: posts.filter((p) => p.status === "published").length, rascunhos: posts.filter((p) => p.status === "draft").length, pages: pages.length, tags: tags.length, users: users.length, imagens: imagens.size, obs: "db/ e themes/ não são acessíveis à chave de integração; tema versionado em ghost/content/themes/hojemt" });
console.log(`backup em ${SAIDA}: ${posts.length} posts (${posts.filter((p) => p.status === "published").length} publicados), ${pages.length} páginas, ${tags.length} tags, ${users.length} autores, ${imagens.size} mídias referenciadas`);

if (typeof args.baixar === "string") {
  await mkdir(args.baixar, { recursive: true });
  let ok = 0, falha = 0;
  for (const u of imagens) {
    const nome = decodeURIComponent(basename(new URL(u).pathname));
    const destino = join(args.baixar, nome);
    if (existsSync(destino)) { ok++; continue; }
    try { const r = await fetch(u); if (!r.ok) throw new Error(r.status); await pipeline(Readable.fromWeb(r.body), createWriteStream(destino)); ok++; }
    catch (e) { falha++; console.error(`falhou ${u}: ${e.message}`); }
  }
  console.log(`mídias baixadas em ${args.baixar}: ${ok} ok, ${falha} falhas`);
}
