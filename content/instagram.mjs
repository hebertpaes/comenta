#!/usr/bin/env node
// =============================================================
// instagram.mjs — publica um card no Instagram (@hoje.mt) com legenda
// =============================================================
//
//   node instagram.mjs --imagem=saida/card.jpg --legenda=legenda.txt            sobe a imagem no Ghost e publica
//   node instagram.mjs --url=https://hojemt.com.br/content/images/x.jpg --legenda=legenda.txt
//   node instagram.mjs --imagem=... --legenda=... --dry-run                     só mostra o que faria
//   node instagram.mjs --permalink=17957814090231322                            link de um post já publicado
//
// Env: IG_USER_ID, IG_ACCESS_TOKEN (Graph API); GHOST_ADMIN_URL, GHOST_ADMIN_API_KEY
// (só quando --imagem, para hospedar a foto numa URL pública).
import { readFile } from "node:fs/promises";
import { publicarFoto, permalink } from "./lib/instagram.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

function morre(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

if (args.permalink) {
  const r = await permalink(String(args.permalink)).catch((e) => morre(e.message));
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

if (!args.legenda) morre("informe --legenda=arquivo.txt");
const legenda = (await readFile(String(args.legenda), "utf8")).trim();
if (legenda.length > 2200) morre(`legenda com ${legenda.length} caracteres (máx. 2.200)`);

let url = args.url ? String(args.url) : "";
if (!url) {
  if (!args.imagem) morre("informe --imagem=arquivo.jpg ou --url=https://...");
  if (args["dry-run"] === true) {
    url = `(subiria ${args.imagem} no Ghost em ${process.env.GHOST_ADMIN_URL || "http://localhost:2368"})`;
  } else {
    const { ghostClient } = await import("./lib/ghost.mjs");
    const api = ghostClient();
    const r = await api.images.upload({ file: String(args.imagem), purpose: "image" });
    if (!r?.url) morre("o Ghost não devolveu a URL da imagem");
    url = r.url;
    console.log(`imagem hospedada: ${url}`);
  }
}

if (args["dry-run"] === true) {
  console.log(`DRY-RUN · conta ${process.env.IG_USER_ID || "(IG_USER_ID vazio)"}`);
  console.log(`imagem: ${url}`);
  console.log(
    `legenda (${legenda.length} caracteres):\n${legenda.slice(0, 300)}${legenda.length > 300 ? "…" : ""}`
  );
  process.exit(0);
}

const r = await publicarFoto({ imagemUrl: url, legenda }).catch((e) => morre(e.message));
console.log(`publicado: ${r.permalink} (id ${r.id}, ${r.timestamp})`);
