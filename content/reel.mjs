#!/usr/bin/env node
// =============================================================
// reel.mjs — transforma uma imagem (charge, card) num Reel 9:16 (1080×1920)
// com movimento lento de câmera (Ken Burns), fundo desfocado, marca-d'água
// do HOJE MT e trilha silenciosa (o Instagram exige faixa de áudio).
// =============================================================
//
//   node reel.mjs pautas/charges/2026-09-23-rua-livre-amigo-instagram-retrato.jpg
//   node reel.mjs imagem.jpg --duracao=12 --saida=pautas/videos/reel.mp4 --zoom=1.12
//
// Precisa do ffmpeg (mesmo binário usado por video.mjs).
import { spawnSync } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const args = {};
const livres = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args[m[1]] = m[2] ?? true;
  else livres.push(a);
}
const entrada = livres[0];
if (!entrada) {
  console.log("uso: reel.mjs <imagem> [--duracao=12] [--zoom=1.12] [--saida=arquivo.mp4] [--sem-marca]");
  process.exit(1);
}
await stat(entrada).catch(() => {
  console.error(`ERRO: arquivo não existe: ${entrada}`);
  process.exit(1);
});
const DUR = Number(args.duracao || 12);
const FPS = 25;
const ZOOM = Number(args.zoom || 1.12);
const saida =
  args.saida ||
  join("pautas", "videos", basename(entrada, extname(entrada)).replace(/-instagram-retrato$/, "") + "-reel.mp4");
await mkdir(dirname(saida), { recursive: true });

function acharFfmpeg() {
  const candidatos = [
    process.env.FFMPEG,
    "/root/.local/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2",
    "ffmpeg",
  ].filter(Boolean);
  for (const c of candidatos) {
    const r = spawnSync(c, ["-version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  throw new Error("ffmpeg não encontrado (defina FFMPEG=/caminho/ffmpeg)");
}
const ffmpeg = acharFfmpeg();
const marca = resolve(aqui, "assets", "hojemt-logo-site-branca.png"); // logo oficial do site (branca, transparente)
const frames = DUR * FPS;
const passo = ((ZOOM - 1) / frames).toFixed(6);

// [0] imagem em loop; [1] marca; [2] silêncio
const filtros = [
  `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:6,eq=brightness=-0.08[bg]`,
  `[0:v]scale=2160:-2,zoompan=z='min(zoom+${passo},${ZOOM})':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1350:fps=${FPS},setsar=1[fg]`,
  `[bg][fg]overlay=(W-w)/2:(H-h)/2[base]`,
];
let ultimo = "[base]";
if (args["sem-marca"] !== true) {
  filtros.push(`[1:v]scale=330:-1,format=rgba,colorchannelmixer=aa=0.9[wm]`);
  filtros.push(`[base][wm]overlay=W-w-48:H-h-140[v]`);
  ultimo = "[v]";
}
const cmd = [
  "-y", "-hide_banner", "-loglevel", "error",
  "-loop", "1", "-i", entrada,
  "-i", marca,
  "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
  "-filter_complex", filtros.join(";"),
  "-map", ultimo, "-map", "2:a",
  "-t", String(DUR), "-r", String(FPS),
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high",
  "-c:a", "aac", "-b:a", "96k", "-shortest",
  "-movflags", "+faststart",
  saida,
];
const r = spawnSync(ffmpeg, cmd, { encoding: "utf8", stdio: ["ignore", "inherit", "pipe"] });
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(1);
}
const info = spawnSync(ffmpeg, ["-hide_banner", "-i", saida], { encoding: "utf8" }).stderr;
console.log(saida);
console.log((info.match(/Duration: [^,]+/) || [""])[0], (info.match(/Video: [^\n]+/) || [""])[0].slice(0, 90));
