#!/usr/bin/env node
// =============================================================
// og-whatsapp.mjs — imagem de compartilhamento (og:image / twitter:image)
// amigável ao WhatsApp, Facebook e X: JPEG 1200×630, < 300 KB.
// =============================================================
//
// O WhatsApp não mostra prévia com imagem WebP, e imagens em retrato
// (1080×1350, os cards do Instagram) saem sem imagem ou como miniatura.
// Este script gera, a partir da og_image atual (ou da feature_image), um
// JPEG paisagem 1200×630 recortado ao centro, sobe para o Ghost e grava em
// og_image e twitter_image do post. A feature_image não muda.
//
//   node og-whatsapp.mjs --slug=<slug>              um post
//   node og-whatsapp.mjs --recentes=60              os N publicados mais recentes
//   node og-whatsapp.mjs --recentes=60 --so-webp    só os que apontam para .webp
//   node og-whatsapp.mjs --slug=x --da-destaque      gera a partir da feature_image (ex.: charge nova)
//   node og-whatsapp.mjs --slug=x --dry-run         mostra o que faria
//
// Env: GHOST_ADMIN_URL, GHOST_ADMIN_API_KEY (id:secret).
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { ghostClient } from "./lib/ghost.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
if (!args.slug && !args.recentes) {
  console.log("uso: og-whatsapp.mjs --slug=<slug> | --recentes=N [--so-webp] [--dry-run]");
  process.exit(1);
}
const DRY = args["dry-run"] === true;
const api = ghostClient();
const TMP = join(process.env.TMPDIR || "/tmp", "og-whatsapp");
await mkdir(TMP, { recursive: true });

/** Baixa a imagem e devolve JPEG 1200×630 (< 300 KB) num arquivo temporário. */
async function paisagem(url, nome) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}: ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  let q = 84;
  let out;
  do {
    out = await sharp(buf)
      .resize(1200, 630, { fit: "cover", position: "attention" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
    q -= 8;
  } while (out.length > 290 * 1024 && q >= 40);
  const arquivo = join(TMP, `${nome}-og.jpg`);
  await writeFile(arquivo, out);
  return { arquivo, bytes: out.length };
}

const jaBom = (u) => /-og\.jpg$/i.test(u || "");
async function listar() {
  if (args.slug) return [await api.posts.read({ slug: String(args.slug) })];
  const max = args.recentes === "all" ? Infinity : Number(args.recentes);
  const todos = [];
  for (let page = 1; todos.length < max; page++) {
    const lote = await api.posts.browse({
      filter: "status:published",
      order: "published_at desc",
      limit: Math.min(100, max - todos.length),
      page,
    });
    todos.push(...lote);
    if (!lote.meta?.pagination?.next) break;
  }
  return todos;
}
const posts = await listar();

let feitos = 0;
for (const p of posts) {
  const origem = args["da-destaque"] === true ? p.feature_image || p.og_image : p.og_image || p.feature_image;
  if (!origem) {
    console.log(`- ${p.slug}: sem imagem, pulo`);
    continue;
  }
  if (jaBom(p.og_image) && args["da-destaque"] !== true) {
    console.log(`- ${p.slug}: já tem og paisagem`);
    continue;
  }
  if (args["so-webp"] === true && !/\.webp(\?|$)/i.test(origem)) {
    console.log(`- ${p.slug}: og já é ${extname(origem)}, pulo`);
    continue;
  }
  const nome = basename(origem, extname(origem)).replace(/[^\w-]/g, "").slice(0, 60) || p.slug;
  console.log(`- ${p.slug}\n    origem: ${origem}`);
  if (DRY) continue;
  try {
    const { arquivo, bytes } = await paisagem(origem, nome);
    const up = await api.images.upload({ file: arquivo, purpose: "image" });
    if (!up?.url) throw new Error("upload sem url");
    const e = await api.posts.edit({
      id: p.id,
      og_image: up.url,
      twitter_image: up.url,
      updated_at: p.updated_at,
    });
    console.log(`    og/twitter: ${e.og_image} (${Math.round(bytes / 1024)} KB)`);
    feitos++;
  } catch (err) {
    console.warn(`    ERRO: ${err.message}`);
  }
}
console.log(`posts atualizados: ${feitos}`);
