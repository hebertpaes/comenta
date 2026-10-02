#!/usr/bin/env node
// =============================================================
// og-whatsapp.mjs — imagem de compartilhamento (og:image / twitter:image)
// amigável ao WhatsApp, Facebook e X: JPEG 1200×630, < 300 KB.
// =============================================================
//
// O WhatsApp não mostra prévia com imagem WebP, e imagens em retrato
// (1080×1350, os cards do Instagram) saem sem imagem ou como miniatura.
// Este script gera um JPEG BASELINE (não progressivo) 1200×630, ≤ 150 KB,
// a partir da foto de destaque (ou da og_image atual, se a foto não for
// paisagem; retrato entra inteiro sobre fundo desfocado), sobe para o Ghost
// como <slug>-wa.jpg e grava em og_image e twitter_image do post. A
// feature_image não muda. Posts que já têm "-wa.jpg" são pulados.
//
//   node og-whatsapp.mjs --slug=<slug>              um post
//   node og-whatsapp.mjs --recentes=60              os N publicados mais recentes
//   node og-whatsapp.mjs --recentes=all             todos os publicados
//   node og-whatsapp.mjs --recentes=60 --so-webp    só os que apontam para .webp
//   node og-whatsapp.mjs --slug=x --da-destaque      refaz a partir da feature_image (ex.: charge nova)
//   node og-whatsapp.mjs --slug=x --forcar          refaz mesmo se já tiver "-wa.jpg"
//   node og-whatsapp.mjs --recentes=all --paralelo=3 três posts por vez
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

/** Baixa a imagem (JPEG, PNG ou WebP) e devolve o buffer e as dimensões. */
async function baixar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}: ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const { width = 0, height = 0 } = await sharp(buf).metadata();
  return { buf, width, height };
}

/**
 * Gera o JPEG de compartilhamento a partir da primeira fonte em PAISAGEM
 * (proporção ≥ 1,3: foto de destaque, charge 16:9, capa); se só houver
 * retrato (card 1080×1350 do Instagram), encaixa o card INTEIRO no centro
 * sobre um fundo desfocado da própria imagem, sem cortar o título.
 * Saída (02/10/2026): JPEG BASELINE (não progressivo), sRGB, 4:2:0,
 * 1200×630, ≤ 150 KB — o formato mais compatível com a prévia do WhatsApp.
 */
async function paisagem(urls, nome) {
  const fontes = [];
  for (const u of urls) {
    if (!u || fontes.some((f) => f.url === u)) continue;
    try { fontes.push({ url: u, ...(await baixar(u)) }); } catch (e) { console.warn(`    fonte falhou: ${e.message}`); }
  }
  if (!fontes.length) throw new Error("nenhuma imagem de origem abriu");
  const deitada = fontes.find((f) => f.height && f.width / f.height >= 1.3);
  // artes da redação (charges, cards, ilustrações: arquivos "AAAA-MM-DD-…")
  // têm legenda e crédito nas bordas: entram inteiras, sem recorte
  const arte = deitada && /\/\d{4}-\d{2}-\d{2}-[^/]+\.(jpe?g|png)$/i.test(deitada.url);
  let base;
  let origem;
  if (arte) {
    origem = deitada.url;
    const fundo = await sharp(deitada.buf).resize(1200, 630, { fit: "cover" }).flatten({ background: "#0b2a20" }).blur(28).modulate({ brightness: 0.55 }).toBuffer();
    const frente = await sharp(deitada.buf).resize(1200, 630, { fit: "inside" }).flatten({ background: "#ffffff" }).toBuffer();
    const m = await sharp(frente).metadata();
    base = await sharp(fundo).composite([{ input: frente, left: Math.round((1200 - m.width) / 2), top: Math.round((630 - m.height) / 2) }]).toBuffer();
  } else if (deitada) {
    origem = deitada.url;
    base = await sharp(deitada.buf).resize(1200, 630, { fit: "cover", position: "attention" }).flatten({ background: "#ffffff" }).toBuffer();
  } else {
    const f = fontes[0];
    origem = f.url;
    const fundo = await sharp(f.buf).resize(1200, 630, { fit: "cover" }).flatten({ background: "#0b2a20" }).blur(28).modulate({ brightness: 0.55 }).toBuffer();
    const frente = await sharp(f.buf).resize(1200, 630, { fit: "inside" }).flatten({ background: "#ffffff" }).toBuffer();
    const m = await sharp(frente).metadata();
    base = await sharp(fundo).composite([{ input: frente, left: Math.round((1200 - m.width) / 2), top: Math.round((630 - m.height) / 2) }]).toBuffer();
  }
  let q = 82;
  let out;
  do {
    out = await sharp(base)
      .toColourspace("srgb")
      .jpeg({ quality: q, progressive: false, chromaSubsampling: "4:2:0", optimiseCoding: true, mozjpeg: false })
      .toBuffer();
    q -= 6;
  } while (out.length > 150 * 1024 && q >= 46);
  const arquivo = join(TMP, `${nome}-wa.jpg`);
  await writeFile(arquivo, out);
  return { arquivo, bytes: out.length, origem, encaixe: !deitada || arte };
}

// "-wa.jpg" = JPEG baseline paisagem gerado por esta versão; "-og.jpg" (versão
// anterior, JPEG progressivo) e os cards em retrato são refeitos.
const jaBom = (u) => /-wa(-\d+)?\.jpg$/i.test(u || ""); // o Ghost acrescenta -1, -2 em nomes repetidos
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
async function processar(p) {
  // a foto de destaque primeiro (em geral paisagem); depois a og atual
  const fontesPost = args["da-destaque"] === true ? [p.feature_image, p.og_image] : [p.feature_image, p.og_image, p.twitter_image];
  const origem = fontesPost.find(Boolean);
  if (!origem) {
    console.log(`- ${p.slug}: sem imagem, pulo`);
    return;
  }
  if (jaBom(p.og_image) && args["da-destaque"] !== true && args.forcar !== true) {
    console.log(`- ${p.slug}: já tem og paisagem`);
    return;
  }
  if (args["so-webp"] === true && !/\.webp(\?|$)/i.test(origem)) {
    console.log(`- ${p.slug}: og já é ${extname(origem)}, pulo`);
    return;
  }
  const nome = p.slug.replace(/[^\w-]/g, "").slice(0, 60) || basename(origem, extname(origem));
  console.log(`- ${p.slug}`);
  if (DRY) return;
  try {
    const { arquivo, bytes, origem: usada, encaixe } = await paisagem(fontesPost, nome);
    console.log(`    origem: ${usada}${encaixe ? " (encaixada inteira, sem recorte)" : ""}`);
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

// fila com N trabalhadores (padrão 1)
const PAR = Math.max(1, Number(args.paralelo) || 1);
let prox = 0;
await Promise.all(Array.from({ length: PAR }, async () => {
  while (prox < posts.length) await processar(posts[prox++]);
}));
console.log(`posts atualizados: ${feitos}`);
