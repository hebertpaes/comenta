#!/usr/bin/env node
// =============================================================
// redes-post.mjs — busca uma postagem pública de rede social para virar
// "cartão de reprodução" (imagem + texto + crédito) ou trecho de vídeo nos
// slides do boletim (editor, 29/09: "somente áudio e slides e vídeos
// demonstrativos com imagens de postagens e vídeos de redes sociais").
//
//   node redes-post.mjs <url> [--saida=<pasta>]
//   node redes-post.mjs --manual --rede=Instagram --perfil=@fulano --autor="Nome"
//        --data=2026-09-28 --texto="legenda" --url=<link> [--imagem=print.jpg] [--video=gravacao.mp4]
//
// Grava <saida>/<rede>-<id>.json (+ imagem e vídeo baixados) e imprime o JSON.
// Padrão de <saida>: pasta redes-cache/ do scratchpad (a mídia de terceiros não
// vai para o repositório; o roteiro guarda só origem, perfil, data e crédito).
//
// O que funciona daqui (29/09/2026):
// - X/Twitter: texto, data, fotos e vídeo do post pelo endpoint público de
//   incorporação (cdn.syndication.twimg.com); precisa do link do post.
// - YouTube: título, canal e miniatura (oEmbed); o download do vídeo é barrado
//   pelo YouTube ("confirme que não é um robô") — não contornar.
// - TikTok: título, perfil e miniatura (oEmbed).
// - Instagram/Facebook: sem acesso sem login e sem permissão na API (a conexão
//   do Zapier devolve "Application does not have permission"): use --manual com
//   o print/gravação enviados pelo editor e o link do post.
//
// Regras (pautas/videos/argos/ARGOS.md): só perfis oficiais de candidatos,
// campanhas, partidos e órgãos públicos; nunca vídeo de imprensa nem de pessoa
// comum; o post comprova o fato narrado; crédito na tela "Reprodução: @perfil
// no <rede>, dd/mm/aaaa"; sem alterar o conteúdo; trecho de vídeo curto e sem
// o áudio original (a voz real só pelo `audio_real` do charge-cena.mjs).
// =============================================================
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const args = {};
const livres = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args[m[1]] = m[2] ?? true;
  else livres.push(a);
}
const SAIDA = resolve(args.saida || "/tmp/claude-0/-home-user-comenta/ff03d673-f500-59f9-930f-1d445e49d183/scratchpad/redes-cache");
mkdirSync(SAIDA, { recursive: true });
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" };

async function json(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} em ${url}`);
  return r.json();
}
async function baixar(url, destino) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ao baixar ${url}`);
  writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  return destino;
}
const dataIso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

async function doX(url) {
  const id = (url.match(/status(?:es)?\/(\d+)/) || [])[1];
  if (!id) throw new Error("link do X sem /status/<id>");
  const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
  const t = await json(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=pt&token=${token}`);
  const post = {
    rede: "X", id, url: `https://x.com/${t.user?.screen_name}/status/${id}`,
    perfil: `@${t.user?.screen_name}`, autor: t.user?.name, data: dataIso(t.created_at),
    texto: t.text, imagem: null, video: null,
  };
  const det = t.mediaDetails || [];
  const vid = det.find((m) => m.type === "video" || m.type === "animated_gif");
  if (vid) {
    const mp4 = (vid.video_info?.variants || []).filter((v) => v.content_type === "video/mp4").sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    if (mp4) post.video = await baixar(mp4.url, join(SAIDA, `x-${id}.mp4`));
    if (vid.media_url_https) post.imagem = await baixar(vid.media_url_https, join(SAIDA, `x-${id}.jpg`));
  } else if (t.photos?.length) {
    post.imagem = await baixar(t.photos[0].url, join(SAIDA, `x-${id}${extname(new URL(t.photos[0].url).pathname) || ".jpg"}`));
  }
  return post;
}

async function doYouTube(url) {
  const id = (url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/) || [])[1];
  if (!id) throw new Error("link do YouTube sem id");
  const o = await json(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`);
  let imagem = null;
  for (const q of ["maxresdefault", "hqdefault"]) {
    try { imagem = await baixar(`https://i.ytimg.com/vi/${id}/${q}.jpg`, join(SAIDA, `youtube-${id}.jpg`)); break; } catch {}
  }
  const perfil = (o.author_url || "").split("/").pop();
  return { rede: "YouTube", id, url: `https://www.youtube.com/watch?v=${id}`, perfil: perfil || null, autor: o.author_name, data: args.data || null, texto: o.title, imagem, video: null, obs: "vídeo não baixado (YouTube pede login para downloads daqui); miniatura e título pelo oEmbed" };
}

async function doTikTok(url) {
  const o = await json(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  const id = (url.match(/video\/(\d+)/) || [])[1] || "perfil";
  const imagem = o.thumbnail_url ? await baixar(o.thumbnail_url, join(SAIDA, `tiktok-${id}.jpg`)) : null;
  return { rede: "TikTok", id, url, perfil: o.author_unique_id ? `@${o.author_unique_id}` : null, autor: o.author_name, data: args.data || null, texto: o.title, imagem, video: null };
}

function manual() {
  for (const k of ["rede", "perfil", "data", "url"]) if (!args[k]) throw new Error(`--manual precisa de --${k}`);
  const id = String(args.id || Date.now());
  const post = { rede: args.rede, id, url: args.url, perfil: args.perfil, autor: args.autor || null, data: args.data, texto: args.texto || "", imagem: null, video: null, origem: "arquivo enviado pelo editor" };
  for (const k of ["imagem", "video"]) {
    if (!args[k]) continue;
    if (!existsSync(args[k])) throw new Error(`arquivo não existe: ${args[k]}`);
    post[k] = join(SAIDA, `${String(args.rede).toLowerCase()}-${id}${extname(args[k])}`);
    copyFileSync(args[k], post[k]);
  }
  return post;
}

let post;
if (args.manual) post = manual();
else {
  const url = livres[0];
  if (!url) { console.error("uso: node redes-post.mjs <url> | --manual ..."); process.exit(1); }
  const h = new URL(url).hostname.replace(/^www\./, "");
  if (/(^|\.)(x|twitter)\.com$/.test(h)) post = await doX(url);
  else if (/youtube\.com$|youtu\.be$/.test(h)) post = await doYouTube(url);
  else if (/tiktok\.com$/.test(h)) post = await doTikTok(url);
  else if (/instagram\.com$|facebook\.com$|fb\.watch$/.test(h)) {
    console.error("Instagram/Facebook: sem acesso daqui (login/permissão). Peça ao editor o print ou a gravação e use --manual com o link do post.");
    process.exit(2);
  } else { console.error(`rede não suportada: ${h}`); process.exit(2); }
}
post.credito = `Reprodução: ${post.perfil || post.autor} no ${post.rede}${post.data ? ", " + post.data.split("-").reverse().join("/") : ""}`;
post.buscado_em = new Date().toISOString();
const arq = join(SAIDA, `${String(post.rede).toLowerCase()}-${post.id}.json`);
writeFileSync(arq, JSON.stringify(post, null, 2));
console.log(JSON.stringify({ ...post, json: arq }, null, 2));
