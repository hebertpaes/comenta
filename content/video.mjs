#!/usr/bin/env node
// =============================================================
// video.mjs — baixa um vídeo (reel, tweet, YouTube…) e aplica a marca d'água
// do HOJE MT com ffmpeg.
// =============================================================
//
//   node video.mjs https://www.instagram.com/reel/XXXX/            baixa e marca
//   node video.mjs arquivo.mp4 --saida=pronto.mp4                 só marca
//   node video.mjs URL --marca=outra.png --opacidade=0.4 --largura=0.28
//   node video.mjs URL --posicao=superior-direita --margem=30
//
// Opções: --saida=arquivo.mp4  --marca=png (padrão assets/hojemt-logo-site-branca.png, a logo oficial do site em branco)
//         --opacidade=0.55  --largura=0.32 (fração da largura do vídeo)
//         --posicao=inferior-direita|inferior-esquerda|superior-direita|superior-esquerda
//         --margem=34  --crf=20  --so-baixar
// Dependências: yt-dlp (pip install yt-dlp) para baixar; ffmpeg no PATH, ou
// FFMPEG_BIN=/caminho/ffmpeg, ou o binário do pacote python imageio-ffmpeg
// (pip install imageio-ffmpeg), que o script localiza sozinho.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const args = {};
const livres = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args[m[1]] = m[2] ?? true;
  else livres.push(a);
}
const entrada = livres[0];
if (!entrada) {
  console.log("uso: video.mjs <url|arquivo.mp4> [--saida=x.mp4] [--marca=png] [--opacidade=0.55]");
  console.log(
    "     [--largura=0.32] [--posicao=inferior-direita] [--margem=34] [--crf=20] [--so-baixar]"
  );
  process.exit(process.argv.length > 2 ? 1 : 0);
}

/** Acha o ffmpeg: FFMPEG_BIN, PATH ou o binário do imageio-ffmpeg. */
function acharFfmpeg() {
  if (process.env.FFMPEG_BIN && existsSync(process.env.FFMPEG_BIN)) return process.env.FFMPEG_BIN;
  if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0) return "ffmpeg";
  const py = spawnSync(
    "python3",
    ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"],
    {
      encoding: "utf8",
    }
  );
  if (py.status === 0 && py.stdout.trim()) return py.stdout.trim();
  throw new Error(
    "ffmpeg não encontrado: instale (apt/brew) ou `pip install imageio-ffmpeg`, ou defina FFMPEG_BIN"
  );
}

/** Baixa com yt-dlp para a pasta `videos/`; devolve o caminho do mp4. */
function baixar(url) {
  const pasta = resolve("videos");
  mkdirSync(pasta, { recursive: true });
  const id =
    (url.match(/\/(?:reel|p|reels|status|shorts|watch\?v=)\/?([A-Za-z0-9_-]{6,})/) || [])[1] ||
    "video";
  const modelo = join(pasta, `${id}.%(ext)s`);
  const r = spawnSync(
    "python3",
    [
      "-m",
      "yt_dlp",
      "--no-warnings",
      "-f",
      "bv*+ba/b",
      "--merge-output-format",
      "mp4",
      "-o",
      modelo,
      url,
    ],
    {
      stdio: "inherit",
    }
  );
  if (r.status !== 0)
    throw new Error(
      "yt-dlp falhou (instale com `pip install yt-dlp`; Instagram limita acessos anônimos, tente de novo em alguns minutos)"
    );
  const arq = readdirSync(pasta).find(
    (f) => f.startsWith(id + ".") && /\.(mp4|mkv|webm|mov)$/i.test(f)
  );
  if (!arq) throw new Error("download não gerou arquivo de vídeo");
  return join(pasta, arq);
}

/** Largura e altura do vídeo, lidas da saída de `ffmpeg -i`. */
function dimensoes(ffmpeg, arquivo) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", arquivo], { encoding: "utf8" });
  const m = (r.stderr || "").match(/Video:.*?\s(\d{2,5})x(\d{2,5})[\s,]/);
  if (!m) throw new Error("não consegui ler as dimensões do vídeo");
  return { largura: Number(m[1]), altura: Number(m[2]) };
}

/** Aplica a marca d'água e devolve o caminho de saída. */
function marcar(ffmpeg, arquivo, saida, { marca, opacidade, largura, posicao, margem, crf }) {
  const pos = {
    "inferior-direita": `W-w-${margem}:H-h-${margem}`,
    "inferior-esquerda": `${margem}:H-h-${margem}`,
    "superior-direita": `W-w-${margem}:${margem}`,
    "superior-esquerda": `${margem}:${margem}`,
  }[posicao];
  if (!pos) throw new Error(`posição inválida: ${posicao}`);
  // a marca é escalada para uma fração da largura do vídeo, com alfa uniforme;
  // a imagem (1 quadro) se repete até o fim do vídeo (eof_action=repeat, padrão)
  const wMarca = Math.max(40, Math.round(dimensoes(ffmpeg, arquivo).largura * largura));
  const filtro =
    `[1:v]scale=${wMarca}:-1,format=rgba,colorchannelmixer=aa=${opacidade}[wm];` +
    `[0:v][wm]overlay=${pos}:format=auto`;
  execFileSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      arquivo,
      "-i",
      marca,
      "-filter_complex",
      filtro,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      String(crf),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      saida,
    ],
    { stdio: "inherit" }
  );
  return saida;
}

const ffmpeg = acharFfmpeg();
const ehUrl = /^https?:\/\//i.test(entrada);
const arquivo = ehUrl ? baixar(entrada) : resolve(entrada);
if (!existsSync(arquivo)) {
  console.error(`ERRO: arquivo não existe: ${arquivo}`);
  process.exit(1);
}
console.log(`vídeo: ${arquivo}`);
if (args["so-baixar"]) process.exit(0);

const marca = resolve(String(args.marca || join(AQUI, "assets", "hojemt-logo-site-branca.png")));
if (!existsSync(marca)) {
  console.error(`ERRO: marca d'água não encontrada: ${marca}`);
  process.exit(1);
}
const saida = resolve(String(args.saida || arquivo.replace(/\.(\w+)$/, "-hojemt.mp4")));
marcar(ffmpeg, arquivo, saida, {
  marca,
  opacidade: Number(args.opacidade ?? 0.55),
  largura: Number(args.largura ?? 0.32),
  posicao: String(args.posicao || "inferior-direita"),
  margem: Number(args.margem ?? 34),
  crf: Number(args.crf ?? 20),
});
console.log(`pronto: ${saida}`);
