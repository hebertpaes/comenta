#!/usr/bin/env node
// =============================================================
// reel-arquivo.mjs — formato "ARQUIVO HOJE MT": vídeo antigo (TV, redes)
// vira Reel 9:16 com gancho, legendas queimadas, crédito da origem e
// cartela final "E depois?" com o que aconteceu com cada personagem.
// =============================================================
//
//   node reel-arquivo.mjs pautas/videos/<nome>.arquivo.json            gera "completo" e "corte"
//   node reel-arquivo.mjs spec.json --so=corte                          só uma das saídas
//
// O JSON (ver pautas/videos/2026-09-24-jo-soares-zanin-dallagnol.arquivo.json):
//   entrada, recorte {x,y,w,h} (região do vídeo dentro do quadro), etiqueta,
//   gancho [linhas], credito, transcricao (JSON do faster-whisper: segmentos com
//   start/end/text), correcoes [[regex, troca]], trechos [[ini,fim]] (só no
//   "corte"), abertura {chip, sub, chamada}, fechamento {titulo, itens
//   [[nome, texto]], fontes}, saidas {completo, corte}.
// Regras editoriais: gancho factual, legendas fiéis ao áudio (correções só de
// nomes/ortografia), crédito da origem sempre na tela, "E depois?" só com fato
// datado e fonte na pauta.
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const FONTES = join(aqui, "assets", "fonts");
const MARCA = join(aqui, "assets", "marca-dagua.png");
const W = 1080, H = 1920, FPS = 30;
const ANTON = "Anton", ROBOTO = "Roboto Condensed";
const VERDE = "#00a859";

const args = {}; const livres = [];
for (const a of process.argv.slice(2)) { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) args[m[1]] = m[2] ?? true; else livres.push(a); }
if (!livres[0]) { console.log("uso: reel-arquivo.mjs <spec.json> [--so=completo|corte]"); process.exit(1); }
const spec = JSON.parse(await readFile(livres[0], "utf8"));
const base = dirname(resolve(livres[0]));
const rel = (p) => (p ? resolve(process.cwd(), p) : p);

// --- sharp com as fontes do projeto (mesmo truque de lib/card.mjs) ---
const fcDir = join(tmpdir(), "hojemt-fontconfig");
await mkdir(join(fcDir, "cache"), { recursive: true });
await writeFile(join(fcDir, "fonts.conf"), `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${FONTES}</dir><dir>/usr/share/fonts</dir><cachedir>${join(fcDir, "cache")}</cachedir></fontconfig>`);
process.env.FONTCONFIG_FILE = join(fcDir, "fonts.conf");
const sharp = (await import("sharp")).default;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function quebrar(texto, max) {
  const out = []; let linha = "";
  for (const p of String(texto).split(/\s+/)) { if ((linha + " " + p).trim().length > max && linha) { out.push(linha); linha = p; } else linha = (linha + " " + p).trim(); }
  if (linha) out.push(linha); return out;
}
const fundoSvg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d3d2a"/><stop offset="1" stop-color="#04150e"/></linearGradient><radialGradient id="r" cx="0.5" cy="0.35" r="0.7"><stop offset="0" stop-color="#1c6b47" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#r)"/>`;
const chipSvg = (x, y, texto, tam = 30) => { const w = Math.round(texto.length * tam * 0.62 + 44); return `<rect x="${x}" y="${y}" width="${w}" height="${tam + 24}" rx="10" fill="${VERDE}"/><text x="${x + 22}" y="${y + tam + 3}" font-family="${ROBOTO}" font-weight="bold" font-size="${tam}" letter-spacing="3" fill="#fff">${esc(texto.toUpperCase())}</text>`; };
async function png(svgCorpo, arquivo, { fundo = true, logo = true } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${fundo ? fundoSvg : ""}${svgCorpo}</svg>`;
  let img = sharp(Buffer.from(svg)).png();
  if (logo) {
    const marca = await sharp(MARCA).resize({ width: 250 }).png().toBuffer();
    const m = await sharp(marca).metadata();
    img = sharp(await img.toBuffer()).composite([{ input: marca, left: W - 250 - 44, top: H - m.height - 96 }]).png();
  }
  await img.toFile(arquivo); return arquivo;
}

// --- geometria do clipe ---
const rc = spec.recorte || {};
const clipW = 1000, clipH = Math.round(clipW * ((rc.h || 9) / (rc.w || 16)) / 2) * 2;
const clipX = 40, clipY = Math.max(530, Math.round((H - clipH) / 2 - 60));

const tmp = join(tmpdir(), "reel-arquivo"); await mkdir(tmp, { recursive: true });

// 1) sobreposição fixa: etiqueta, gancho, moldura, crédito, logo
const gancho = spec.gancho || [];
let over = chipSvg(40, 140, spec.etiqueta || "ARQUIVO HOJE MT");
gancho.forEach((l, i) => { over += `<text x="40" y="${230 + 78 + i * 86}" font-family="${ANTON}" font-size="76" fill="#fff" letter-spacing="-1">${esc(l.toUpperCase())}</text>`; });
over += `<rect x="${clipX - 3}" y="${clipY - 3}" width="${clipW + 6}" height="${clipH + 6}" rx="8" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="3"/>`;
quebrar(spec.credito || "", 62).forEach((l, i) => { over += `<text x="40" y="${1708 + i * 32}" font-family="${ROBOTO}" font-size="26" fill="#cfe9db">${esc(l)}</text>`; });
const overlayPng = await png(over, join(tmp, "overlay.png"), { fundo: false, logo: true });
const fundoPng = await png("", join(tmp, "fundo.png"), { fundo: true, logo: false });

// 2) abertura
const ab = spec.abertura || {};
let abSvg = chipSvg(40, 470, ab.chip || "ARQUIVO HOJE MT", 34);
gancho.forEach((l, i) => { abSvg += `<text x="40" y="${600 + 96 + i * 108}" font-family="${ANTON}" font-size="98" fill="#fff" letter-spacing="-1">${esc(l.toUpperCase())}</text>`; });
if (ab.sub) abSvg += `<text x="40" y="${600 + gancho.length * 108 + 60}" font-family="${ROBOTO}" font-weight="bold" font-size="36" fill="#8fd6b4" letter-spacing="2">${esc(ab.sub.toUpperCase())}</text>`;
quebrar(ab.chamada || "", 40).forEach((l, i) => { abSvg += `<text x="40" y="${600 + gancho.length * 108 + 140 + i * 46}" font-family="${ROBOTO}" font-size="38" fill="#fff" fill-opacity="0.9">${esc(l)}</text>`; });
const aberturaPng = await png(abSvg, join(tmp, "abertura.png"));

// 3) fechamento "E depois?"
const fe = spec.fechamento || {};
let feSvg = chipSvg(40, 200, spec.etiqueta || "ARQUIVO HOJE MT", 30);
feSvg += `<text x="40" y="${300 + 120}" font-family="${ANTON}" font-size="120" fill="#fff">${esc((fe.titulo || "E DEPOIS?").toUpperCase())}</text>`;
let y = 520;
for (const [nome, texto] of fe.itens || []) {
  feSvg += `<rect x="40" y="${y - 30}" width="8" height="${40 + quebrar(texto, 46).length * 44}" fill="${VERDE}"/>`;
  feSvg += `<text x="70" y="${y}" font-family="${ROBOTO}" font-weight="bold" font-size="42" fill="#8fd6b4">${esc(nome)}</text>`;
  quebrar(texto, 46).forEach((l, i) => { feSvg += `<text x="70" y="${y + 48 + i * 44}" font-family="${ROBOTO}" font-size="37" fill="#fff">${esc(l)}</text>`; });
  y += 48 + quebrar(texto, 46).length * 44 + 44;
}
quebrar(fe.fontes || "", 60).forEach((l, i) => { feSvg += `<text x="40" y="${Math.max(y + 30, 1560) + i * 34}" font-family="${ROBOTO}" font-size="27" fill="#cfe9db">${esc(l)}</text>`; });
feSvg += `<text x="40" y="1790" font-family="${ROBOTO}" font-weight="bold" font-size="34" fill="#fff">hojemt.com.br</text>`;
const fechamentoPng = await png(feSvg, join(tmp, "fechamento.png"));

// 4) legendas (ASS) a partir da transcrição, com correções e remapeamento para os trechos
const segs = spec.transcricao ? JSON.parse(await readFile(rel(spec.transcricao), "utf8")) : [];
const correcoes = (spec.correcoes || []).map(([re, t]) => [new RegExp(re, "g"), t]);
const corrigir = (s) => correcoes.reduce((acc, [re, t]) => acc.replace(re, t), s);
function chunks(seg) {
  const texto = corrigir(seg.text).trim(); if (!texto) return [];
  const partes = quebrar(texto, 26); const total = partes.reduce((n, p) => n + p.length, 0) || 1;
  let t = seg.start; const dur = Math.max(0.4, seg.end - seg.start);
  return partes.map((p) => { const d = (dur * p.length) / total; const c = { s: t, e: t + d, txt: p }; t += d; return c; });
}
const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = x % 60; return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`; };
function ass(trechos) {
  const linhas = [];
  const mapa = trechos ? (() => { let off = 0; return trechos.map(([a, b]) => { const m = { a, b, off }; off += b - a; return m; }); })() : null;
  for (const seg of segs) for (const c of chunks(seg)) {
    if (!mapa) { linhas.push([c.s, c.e, c.txt]); continue; }
    for (const m of mapa) { const s = Math.max(c.s, m.a), e = Math.min(c.e, m.b); if (e - s >= 0.25) linhas.push([s - m.a + m.off, e - m.a + m.off, c.txt]); }
  }
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Leg,Anton,66,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,5,2,2,60,60,${H - 1610},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
    linhas.map(([s, e, t]) => `Dialogue: 0,${ts(s)},${ts(e)},Leg,,0,0,0,,${t.toUpperCase().replace(/\{/g, "(").replace(/\}/g, ")")}`).join("\n") + "\n";
}

// 5) ffmpeg
function acharFfmpeg() { for (const c of [process.env.FFMPEG, "/root/.local/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2", "ffmpeg"].filter(Boolean)) if (spawnSync(c, ["-version"]).status === 0) return c; throw new Error("ffmpeg não encontrado"); }
const ffmpeg = acharFfmpeg();
const dAb = spec.duracoes?.abertura ?? 2.5, dFe = spec.duracoes?.fechamento ?? 7;

async function render(saida, trechos) {
  const assPath = join(tmp, "legendas-" + (trechos ? "corte" : "completo") + ".ass");
  await writeFile(assPath, ass(trechos));
  const crop = `crop=${rc.w}:${rc.h}:${rc.x || 0}:${rc.y || 0}`;
  let f = "";
  if (trechos) {
    trechos.forEach(([a, b], i) => { f += `[0:v]${crop},trim=${a}:${b},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS[a${i}];`; });
    f += trechos.map((_, i) => `[v${i}][a${i}]`).join("") + `concat=n=${trechos.length}:v=1:a=1[vc][ac];`;
  } else f += `[0:v]${crop}[vc];[0:a]anull[ac];`;
  f += `[vc]scale=${clipW}:${clipH}:flags=lanczos,unsharp=5:5:0.5,fps=${FPS},setsar=1[clip];`;
  f += `[1:v]fps=${FPS},format=rgba[bg];[bg][clip]overlay=${clipX}:${clipY}:shortest=1:format=auto[b1];`;
  f += `[b1][2:v]overlay=0:0:shortest=1:format=auto[b2];[b2]ass='${assPath.replace(/'/g, "\\'")}':fontsdir='${FONTES}',format=yuv420p[body];`;
  f += `[ac]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo[ba];`;
  f += `[3:v]fps=${FPS},format=yuv420p,setsar=1[op];[4:v]fps=${FPS},format=yuv420p,setsar=1[cl];`;
  f += `[op][5:a][body][ba][cl][6:a]concat=n=3:v=1:a=1[v][a]`;
  const cmd = ["-y", "-hide_banner", "-loglevel", "error", "-stats",
    "-i", rel(spec.entrada), "-loop", "1", "-i", fundoPng, "-loop", "1", "-i", overlayPng,
    "-loop", "1", "-t", String(dAb), "-i", aberturaPng, "-loop", "1", "-t", String(dFe), "-i", fechamentoPng,
    "-f", "lavfi", "-t", String(dAb), "-i", "anullsrc=r=48000:cl=stereo", "-f", "lavfi", "-t", String(dFe), "-i", "anullsrc=r=48000:cl=stereo",
    "-filter_complex", f, "-map", "[v]", "-map", "[a]", "-r", String(FPS),
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", rel(saida)];
  await mkdir(dirname(rel(saida)), { recursive: true });
  const r = spawnSync(ffmpeg, cmd, { encoding: "utf8", stdio: ["ignore", "inherit", "pipe"] });
  if (r.status !== 0) { console.error(r.stderr.slice(-2000)); throw new Error("ffmpeg falhou em " + saida); }
  const info = spawnSync(ffmpeg, ["-hide_banner", "-i", rel(saida)], { encoding: "utf8" }).stderr;
  console.log(`\n${saida}: ${(info.match(/Duration: [^,]+/) || [""])[0]}`);
}

const saidas = spec.saidas || { completo: spec.saida };
const so = args.so;
if (saidas.completo && (!so || so === "completo")) await render(saidas.completo, null);
if (saidas.corte && spec.trechos && (!so || so === "corte")) await render(saidas.corte, spec.trechos);
console.log("cartelas e sobreposição em", tmp);
