#!/usr/bin/env node
// =============================================================
// charge-cena.mjs — "Charge em cena": monta um Reel 9:16 (1080×1920, 25 fps)
// a partir de um roteiro .cena.json: cartela de abertura com gancho, uma
// cena por ideia (imagem + narração sintetizada + movimento de câmera),
// legendas queimadas em amarelo (estilo Capivara Play), marca d'água do
// HOJE MT e cartela de fechamento com link, fontes e aviso de sátira/IA.
// =============================================================
//
//   node charge-cena.mjs pautas/videos/2026-09-25-paula-em-13-votos.cena.json
//   node charge-cena.mjs <spec.cena.json> --so-audio     só sintetiza as vozes
//   node charge-cena.mjs <spec.cena.json> --sem-marca    sem marca d'água
//
// Roteiro (.cena.json): { titulo, materia, voz:{motor,narrador,personagem,
// velocidade}, abertura:{chip,gancho,sub}, cenas:[{n,quem,fala,legenda?,
// imagem,movimento,citacao?}], fechamento:{linha1,leia,fontes,aviso}, saida }.
// `quem` = "narrador" ou nome do personagem (este só fala com `citacao: true`,
// frase exatamente como está na curta). Caminhos relativos são relativos a
// content/. Regras editoriais: README.md e pautas/README.md.
//
// Dependências (nada novo): Node 22 + sharp (node_modules do repo); ffmpeg
// (mesma detecção de reel.mjs: FFMPEG, binário do imageio-ffmpeg ou PATH;
// precisa de libass + zoompan + loudnorm; NÃO usa drawtext); Piper TTS
// (`python3 -m piper`) com as vozes em $HOJEMT_VOZES
// (padrão /root/.local/share/hojemt-vozes); gTTS como reserva.
// Fontes: assets/fonts (Anton, Roboto Condensed) via fontconfig gerado em
// tempo de execução — o mesmo truque de lib/card.mjs.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { medir, quebrar } from "./lib/card.mjs";

const aqui = dirname(fileURLToPath(import.meta.url));
const FONTES_DIR = join(aqui, "assets", "fonts");
const LOGO = join(aqui, "assets", "hojemt-logo-site-branca.png");
const VOZES_DIR = process.env.HOJEMT_VOZES || "/root/.local/share/hojemt-vozes";

const W = 1080;
const H = 1920;
const FPS = 25;
const DUR_ABERTURA = 2.5;
const DUR_FECHAMENTO = 3;
const FOLGA_CENA = 0.45; // silêncio depois da fala
const DUR_MIN_CENA = 2.5;

const ANTON = "Anton";
const ROBOTO = "Roboto Condensed";
const VERDE_CHIP = "#00A859";
const VERDE_CLARO = "#CFE9DD";
const AVISO_PADRAO =
  "Sátira. Caricaturas de pessoas públicas; falas de personagens só com citação real. Cenas de ficção geradas com IA.";

// ---------------------------------------------------------------- argumentos
const args = {};
const livres = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args[m[1]] = m[2] ?? true;
  else livres.push(a);
}
if (!livres[0]) {
  console.log("uso: charge-cena.mjs pautas/videos/<spec>.cena.json [--so-audio] [--sem-marca]");
  process.exit(process.argv.length > 2 ? 1 : 0);
}

/** Resolve um caminho do JSON: absoluto, relativo a content/ ou ao cwd. */
function caminho(p) {
  if (!p) return p;
  if (isAbsolute(p)) return p;
  const emContent = resolve(aqui, p);
  if (existsSync(emContent)) return emContent;
  const noCwd = resolve(p);
  return existsSync(noCwd) ? noCwd : emContent;
}

const specPath = caminho(livres[0]);
if (!existsSync(specPath)) {
  console.error(`ERRO: roteiro não existe: ${livres[0]}`);
  process.exit(1);
}
const spec = JSON.parse(await readFile(specPath, "utf8"));
if (!Array.isArray(spec.cenas) || spec.cenas.length === 0) {
  console.error("ERRO: o roteiro precisa de pelo menos uma cena em `cenas`.");
  process.exit(1);
}
const saida = spec.saida
  ? isAbsolute(spec.saida)
    ? spec.saida
    : resolve(aqui, spec.saida)
  : join(aqui, "pautas", "videos", `${basename(specPath).replace(/\.cena\.json$/, "")}-cena.mp4`);

// ---------------------------------------------------------------- ffmpeg
function acharFfmpeg() {
  const candidatos = [
    process.env.FFMPEG,
    process.env.FFMPEG_BIN,
    "/root/.local/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2",
    "ffmpeg",
  ].filter(Boolean);
  for (const c of candidatos) {
    const r = spawnSync(c, ["-version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  const py = spawnSync("python3", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"], {
    encoding: "utf8",
  });
  if (py.status === 0 && py.stdout.trim()) return py.stdout.trim();
  throw new Error("ffmpeg não encontrado (defina FFMPEG=/caminho/ffmpeg ou pip install imageio-ffmpeg)");
}
const ffmpeg = acharFfmpeg();

/** Roda o ffmpeg e lança erro legível se falhar. */
function rodarFfmpeg(argumentos, rotulo) {
  const r = spawnSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...argumentos], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`ffmpeg falhou em ${rotulo}:\n${r.stderr}`);
  return r;
}

/** Duração real (s) de um arquivo de áudio/vídeo, decodificando até o fim. */
function duracaoDe(arquivo) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-nostats", "-i", arquivo, "-f", "null", "-"], {
    encoding: "utf8",
  });
  const saidaTxt = `${r.stderr}\n${r.stdout}`;
  const tempos = [...saidaTxt.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
  if (tempos.length) {
    const [, h, m, s] = tempos[tempos.length - 1];
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  }
  const d = saidaTxt.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (d) return Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]);
  throw new Error(`não consegui medir a duração de ${arquivo}`);
}

/** Escapa um caminho para uso dentro de um filtro do ffmpeg (entre aspas simples). */
const escFiltro = (p) => p.replace(/\\/g, "\\\\").replace(/'/g, "'\\''").replace(/:/g, "\\:");

// ---------------------------------------------------------------- sharp + fontes
let sharpMod;
/** Aponta o fontconfig para as fontes do projeto e carrega o sharp (como lib/card.mjs). */
async function sharpComFontes() {
  if (sharpMod) return sharpMod;
  const dir = join(tmpdir(), "hojemt-fontconfig");
  await mkdir(dir, { recursive: true });
  const conf = join(dir, "fonts.conf");
  await writeFile(
    conf,
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>
  <dir>${FONTES_DIR}</dir><dir>/usr/share/fonts</dir><dir>/usr/local/share/fonts</dir>
  <cachedir>${join(dir, "cache")}</cachedir></fontconfig>`
  );
  process.env.FONTCONFIG_FILE = conf;
  sharpMod = (await import("sharp")).default;
  return sharpMod;
}

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const maiusculas = (s) => String(s).toLocaleUpperCase("pt-BR");

/** Linhas <text> centralizadas; devolve o SVG e o y onde a última linha termina. */
function linhasSvg(linhas, { y, tamanho, fonte, cor = "#fff", peso = "normal", entrelinha = 1.12, espacamento = 0, opacidade = 1 }) {
  const partes = linhas.map(
    (l, i) =>
      `<text x="${W / 2}" y="${Math.round(y + tamanho * 0.9 + i * tamanho * entrelinha)}" text-anchor="middle" font-family="${fonte}" font-size="${tamanho}" font-weight="${peso}" letter-spacing="${espacamento}" fill="${cor}" fill-opacity="${opacidade}">${esc(l)}</text>`
  );
  return { svg: partes.join(""), fim: y + linhas.length * tamanho * entrelinha };
}

/** Maior corpo (≥ 96 px) em que o gancho cabe em até `maxLinhas`. */
async function ajustaGancho(texto, larguraPx, maxLinhas = 3) {
  for (const tamanho of [150, 136, 124, 112, 104, 96]) {
    const linhas = await quebrar(texto, larguraPx, { fonte: ANTON, tamanho, espacamento: -1 });
    if (linhas.length <= maxLinhas) return { tamanho, linhas };
  }
  return { tamanho: 96, linhas: (await quebrar(texto, larguraPx, { fonte: ANTON, tamanho: 96, espacamento: -1 })).slice(0, 4) };
}

const FUNDO = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0B3B2E"/><stop offset="1" stop-color="#062A21"/>
    </linearGradient>
    <radialGradient id="brilho" cx="50%" cy="18%" r="70%">
      <stop offset="0" stop-color="#1C6A4E" stop-opacity="0.55"/><stop offset="1" stop-color="#062A21" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#brilho)"/>`;

/** Logo branca centralizada no topo da cartela (camada do sharp). */
async function camadaLogo(sharp, largura = 380, top = 120) {
  const buf = await sharp(LOGO).resize({ width: largura }).png().toBuffer();
  const { height } = await sharp(buf).metadata();
  return { input: buf, left: Math.round((W - largura) / 2), top, height };
}

/** Cartela de abertura: chip, gancho grande (terço de cima), sublinha. */
async function cartelaAbertura({ chip = "CHARGE EM CENA", gancho = "", sub = "" }, destino) {
  const sharp = await sharpComFontes();
  const logo = await camadaLogo(sharp, 360, 90);

  const chipTxt = maiusculas(chip);
  const chipTam = 36;
  const chipW = Math.round((await medir(chipTxt, { fonte: ROBOTO, tamanho: chipTam, peso: "bold", espacamento: 4 })) + 72);
  const chipY = 290;
  const chipSvg = `<rect x="${Math.round((W - chipW) / 2)}" y="${chipY}" width="${chipW}" height="66" rx="33" fill="${VERDE_CHIP}"/>
  <text x="${W / 2}" y="${chipY + 46}" text-anchor="middle" font-family="${ROBOTO}" font-weight="bold" font-size="${chipTam}" letter-spacing="4" fill="#fff">${esc(chipTxt)}</text>`;

  const g = await ajustaGancho(maiusculas(gancho), 940, 3);
  const ganchoSvg = linhasSvg(g.linhas, { y: 396, tamanho: g.tamanho, fonte: ANTON, espacamento: -1, entrelinha: 1.08 });

  let subSvg = "";
  if (sub) {
    const subLinhas = (await quebrar(sub, 900, { fonte: ROBOTO, tamanho: 48 })).slice(0, 2);
    subSvg = linhasSvg(subLinhas, { y: ganchoSvg.fim + 40, tamanho: 48, fonte: ROBOTO, cor: VERDE_CLARO }).svg;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${FUNDO}
  ${chipSvg}
  ${ganchoSvg.svg}
  ${subSvg}
  <rect x="${W / 2 - 60}" y="${H - 300}" width="120" height="6" rx="3" fill="${VERDE_CHIP}"/>
  <text x="${W / 2}" y="${H - 220}" text-anchor="middle" font-family="${ROBOTO}" font-size="38" letter-spacing="2" fill="${VERDE_CLARO}">hojemt.com.br</text>
</svg>`;
  await sharp(Buffer.from(svg)).composite([{ input: logo.input, left: logo.left, top: logo.top }]).png().toFile(destino);
}

/** Cartela de fechamento: crédito, link da curta, fontes, aviso e "Siga @hoje.mt". */
async function cartelaFechamento(
  { linha1 = "Charge: HOJE MT · hojemt.com.br", leia = "", fontes = [], aviso = AVISO_PADRAO, siga = "Siga @hoje.mt" },
  destino
) {
  const sharp = await sharpComFontes();
  const logo = await camadaLogo(sharp, 420, 150);

  const partes = [];
  let y = 460;
  const l1 = (await quebrar(linha1, 940, { fonte: ANTON, tamanho: 60 })).slice(0, 2);
  let t = linhasSvg(l1, { y, tamanho: 60, fonte: ANTON });
  partes.push(t.svg);
  y = t.fim + 60;

  if (leia) {
    t = linhasSvg(["Leia a curta:"], { y, tamanho: 44, fonte: ROBOTO, cor: VERDE_CLARO });
    partes.push(t.svg);
    y = t.fim + 6;
    const link = (await quebrar(leia, 940, { fonte: ROBOTO, tamanho: 44, peso: "bold" })).slice(0, 2);
    t = linhasSvg(link, { y, tamanho: 44, fonte: ROBOTO, peso: "bold" });
    partes.push(t.svg);
    y = t.fim + 50;
  }

  const listaFontes = Array.isArray(fontes) ? fontes.filter(Boolean) : String(fontes || "").split(/\s*,\s*/).filter(Boolean);
  if (listaFontes.length) {
    const linhas = (await quebrar(`Fontes: ${listaFontes.join(" · ")}`, 940, { fonte: ROBOTO, tamanho: 40 })).slice(0, 3);
    t = linhasSvg(linhas, { y, tamanho: 40, fonte: ROBOTO, cor: VERDE_CLARO });
    partes.push(t.svg);
    y = t.fim + 40;
  }

  partes.push(`<rect x="${W / 2 - 60}" y="${y}" width="120" height="6" rx="3" fill="${VERDE_CHIP}"/>`);
  y += 46;
  const avisoLinhas = (await quebrar(aviso, 900, { fonte: ROBOTO, tamanho: 36 })).slice(0, 5);
  t = linhasSvg(avisoLinhas, { y, tamanho: 36, fonte: ROBOTO, cor: VERDE_CLARO, entrelinha: 1.2 });
  partes.push(t.svg);

  const sigaTxt = maiusculas(siga);
  const sigaW = Math.round((await medir(sigaTxt, { fonte: ANTON, tamanho: 48, espacamento: 2 })) + 90);
  const sigaY = H - 330;
  partes.push(`<rect x="${Math.round((W - sigaW) / 2)}" y="${sigaY}" width="${sigaW}" height="92" rx="46" fill="${VERDE_CHIP}"/>
  <text x="${W / 2}" y="${sigaY + 64}" text-anchor="middle" font-family="${ANTON}" font-size="48" letter-spacing="2" fill="#fff">${esc(sigaTxt)}</text>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${FUNDO}
  ${partes.join("\n  ")}
</svg>`;
  await sharp(Buffer.from(svg)).composite([{ input: logo.input, left: logo.left, top: logo.top }]).png().toFile(destino);
}

// ---------------------------------------------------------------- voz
/** Ponto de encaixe: cada motor recebe (texto, opções) e devolve o caminho do áudio. */
const motoresVoz = {
  piper(texto, { modelo, velocidade = 1, destino }) {
    const arquivo = modelo.endsWith(".onnx") ? modelo : `${modelo}.onnx`;
    const modeloPath = isAbsolute(arquivo) ? arquivo : join(VOZES_DIR, arquivo);
    if (!existsSync(modeloPath)) throw new Error(`voz do Piper não encontrada: ${modeloPath} (HOJEMT_VOZES=${VOZES_DIR})`);
    const lengthScale = (1 / Math.max(0.25, Number(velocidade) || 1)).toFixed(3);
    const r = spawnSync("python3", ["-m", "piper", "-m", modeloPath, "-f", destino, "--length-scale", lengthScale], {
      input: `${texto.trim()}\n`,
      encoding: "utf8",
    });
    if (r.status !== 0) {
      const erro = new Error(`Piper falhou: ${r.stderr.trim().split("\n").slice(-3).join(" | ")}`);
      erro.piperIndisponivel = /No module named|not found|ModuleNotFoundError/.test(r.stderr);
      throw erro;
    }
    return destino;
  },
  gtts(texto, { destino }) {
    const mp3 = destino.replace(/\.wav$/, ".mp3");
    const py = "import sys\nfrom gtts import gTTS\ngTTS(sys.stdin.read(), lang='pt', tld='com.br').save(sys.argv[1])\n";
    const r = spawnSync("python3", ["-c", py, mp3], { input: texto.trim(), encoding: "utf8" });
    if (r.status !== 0) throw new Error(`gTTS falhou: ${r.stderr.trim().split("\n").slice(-2).join(" | ")}`);
    return mp3;
  },
  elevenlabs() {
    throw new Error("motor de voz 'elevenlabs' ainda não está conectado (falta credencial/integração); use piper ou gtts");
  },
  heygen() {
    throw new Error("motor de voz 'heygen' ainda não está conectado (falta credencial/integração); use piper ou gtts");
  },
};

/** Sintetiza uma fala; com Piper indisponível, cai para o gTTS avisando. */
function sintetizar(texto, { motor = "piper", modelo, velocidade, destino }) {
  const fn = motoresVoz[motor];
  if (!fn) throw new Error(`motor de voz desconhecido: ${motor} (use piper, gtts, elevenlabs ou heygen)`);
  try {
    return fn(texto, { modelo, velocidade, destino });
  } catch (e) {
    if (motor === "piper" && e.piperIndisponivel) {
      console.warn(`AVISO: ${e.message} — usando gTTS como reserva`);
      return motoresVoz.gtts(texto, { destino });
    }
    throw e;
  }
}

// ---------------------------------------------------------------- legendas (.ass)
/** Quebra um texto em linhas de até `max` caracteres (palavras inteiras). */
function quebrarChars(texto, max = 26) {
  const linhas = [];
  let atual = "";
  for (const p of texto.split(/\s+/).filter(Boolean)) {
    const tent = atual ? `${atual} ${p}` : p;
    if (atual && tent.length > max) {
      linhas.push(atual);
      atual = p;
    } else atual = tent;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Blocos de legenda (até 2 linhas cada), com tempos proporcionais ao texto. */
function blocosLegenda(texto, inicio, duracaoAudio, fimCena) {
  const linhas = quebrarChars(maiusculas(texto), 21);
  const blocos = [];
  for (let i = 0; i < linhas.length; i += 2) blocos.push(linhas.slice(i, i + 2));
  const total = blocos.reduce((s, b) => s + b.join(" ").length, 0) || 1;
  const eventos = [];
  let t = inicio;
  blocos.forEach((b, i) => {
    const fatia = (duracaoAudio * b.join(" ").length) / total;
    const fim = i === blocos.length - 1 ? Math.min(fimCena, inicio + duracaoAudio + 0.3) : t + fatia;
    eventos.push({ inicio: t, fim, texto: b.join("\\N") });
    t = fim;
  });
  return eventos;
}

const tempoAss = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = (s % 60).toFixed(2).padStart(5, "0");
  return `${h}:${String(m).padStart(2, "0")}:${seg}`;
};

function arquivoAss(eventos) {
  const cabecalho = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cena,Anton,90,&H0000D4FF,&H0000D4FF,&H00000000,&H80000000,0,0,0,0,100,100,1,0,1,6,2,2,50,50,430,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const linhas = eventos.map(
    (e) => `Dialogue: 0,${tempoAss(e.inicio)},${tempoAss(e.fim)},Cena,,0,0,0,,{\\an2}${e.texto.replace(/[{}]/g, "")}`
  );
  return cabecalho + linhas.join("\n") + "\n";
}

// ---------------------------------------------------------------- vídeo por cena
/** Filtro de câmera (zoompan) segundo `movimento`; entrada já em 2160×3840. */
function filtroMovimento(movimento, frames) {
  const n = Math.max(1, frames - 1);
  const p = `on/${n}`; // progresso 0→1
  const centro = `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
  switch (movimento) {
    case "zoom-out":
      return `zoompan=z='1.10-0.10*${p}':${centro}`;
    case "pan-esq": // câmera desliza para a esquerda (imagem vai para a direita)
      return `zoompan=z='1.08':x='(iw-iw/zoom)*(1-${p})':y='ih/2-(ih/zoom/2)'`;
    case "pan-dir":
      return `zoompan=z='1.08':x='(iw-iw/zoom)*${p}':y='ih/2-(ih/zoom/2)'`;
    case "parado":
      return `zoompan=z='1.0':x='0':y='0'`;
    case "zoom-in":
    default:
      return `zoompan=z='1+0.10*${p}':${centro}`;
  }
}

/** Renderiza um segmento (imagem + áudio ou silêncio) de `dur` s em mkv sem perdas. */
async function segmento({ imagem, audio, dur, movimento, destino }) {
  const sharp = await sharpComFontes();
  const meta = await sharp(imagem).metadata();
  const proporcaoOk = Math.abs(meta.width / meta.height - W / H) < 0.02;
  const frames = Math.round(dur * FPS);
  const zoom = `${filtroMovimento(movimento, frames)}:d=${frames}:s=${W}x${H}:fps=${FPS}`;

  // imagem fora de 9:16: fundo desfocado (como reel.mjs) e imagem inteira por cima
  const preparo = proporcaoOk
    ? `[0:v]scale=${W * 2}:${H * 2}:flags=lanczos[base]`
    : `[0:v]split[a][b];[a]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},boxblur=40:8,eq=brightness=-0.08[bg];[b]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=decrease:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[base]`;
  const filtros = [`${preparo}`, `[base]${zoom},setsar=1,format=yuv420p[v]`];
  const entradas = ["-i", imagem];
  if (audio) {
    entradas.push("-i", audio);
    filtros.push(`[1:a]aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo,apad[a]`);
  } else {
    entradas.push("-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo");
    filtros.push(`[1:a]aformat=sample_fmts=s16[a]`);
  }
  rodarFfmpeg(
    [
      ...entradas,
      "-filter_complex", filtros.join(";"),
      "-map", "[v]", "-map", "[a]",
      "-t", dur.toFixed(3), "-r", String(FPS),
      "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p",
      "-c:a", "pcm_s16le",
      destino,
    ],
    `segmento ${basename(destino)}`
  );
  return destino;
}

// ---------------------------------------------------------------- principal
const tmp = await mkdtemp(join(tmpdir(), "hojemt-cena-"));
async function principal() {
  const voz = { motor: "piper", narrador: "pt_BR-faber-medium", personagem: "pt_BR-jeff-medium", velocidade: 1.0, ...(spec.voz || {}) };

  // 1. vozes
  const cenas = [];
  for (const [i, c] of spec.cenas.entries()) {
    const n = c.n ?? i + 1;
    const fala = String(c.fala || "").trim();
    if (!fala) throw new Error(`cena ${n}: falta \`fala\``);
    const quem = String(c.quem || "narrador").trim();
    const ehNarrador = quem.toLowerCase() === "narrador";
    if (!ehNarrador && c.citacao !== true)
      throw new Error(`cena ${n}: personagem "${quem}" só fala com citação real (\`citacao: true\` e frase entre aspas na curta)`);
    const modelo = ehNarrador ? voz.narrador : c.modelo_voz || voz.personagem;
    const destino = join(tmp, `cena-${String(n).padStart(2, "0")}.wav`);
    process.stdout.write(`voz ${n} (${quem}, ${voz.motor}/${modelo})… `);
    const audio = sintetizar(fala, { motor: voz.motor, modelo, velocidade: c.velocidade ?? voz.velocidade, destino });
    const duracaoAudio = duracaoDe(audio);
    const dur = Math.max(DUR_MIN_CENA, duracaoAudio + FOLGA_CENA);
    console.log(`${duracaoAudio.toFixed(2)} s → cena ${dur.toFixed(2)} s`);
    cenas.push({ n, quem, fala, legenda: c.legenda || fala, imagem: c.imagem, movimento: c.movimento || "zoom-in", audio, duracaoAudio, dur });
  }

  if (args["so-audio"] === true) {
    const pasta = saida.replace(/\.mp4$/, "") + "-voz";
    await mkdir(pasta, { recursive: true });
    for (const c of cenas) {
      const alvo = join(pasta, basename(c.audio));
      await writeFile(alvo, await readFile(c.audio));
      c.audio = alvo;
    }
    console.log(`áudios em ${pasta}`);
    console.log(JSON.stringify(cenas.map((c) => ({ n: c.n, quem: c.quem, duracao_audio: +c.duracaoAudio.toFixed(2), duracao_cena: +c.dur.toFixed(2), audio: c.audio })), null, 2));
    return;
  }

  // 2. imagens das cenas precisam existir
  for (const c of cenas) {
    if (!c.imagem) throw new Error(`cena ${c.n}: falta \`imagem\``);
    c.imagem = caminho(c.imagem);
    if (!existsSync(c.imagem)) throw new Error(`cena ${c.n}: imagem não existe: ${c.imagem}`);
  }

  // 3. cartelas
  const abertura = join(tmp, "abertura.png");
  const fechamento = join(tmp, "fechamento.png");
  await cartelaAbertura(spec.abertura || { gancho: spec.titulo || "" }, abertura);
  await cartelaFechamento(
    { leia: spec.materia ? spec.materia.replace(/^https?:\/\//, "").replace(/\/$/, "") : "", ...(spec.fechamento || {}) },
    fechamento
  );

  // 4. segmentos
  const lista = [];
  lista.push(await segmento({ imagem: abertura, dur: DUR_ABERTURA, movimento: "parado", destino: join(tmp, "seg-00-abertura.mkv") }));
  for (const c of cenas) {
    process.stdout.write(`cena ${c.n} (${c.movimento})… `);
    lista.push(await segmento({ imagem: c.imagem, audio: c.audio, dur: c.dur, movimento: c.movimento, destino: join(tmp, `seg-${String(c.n).padStart(2, "0")}.mkv`) }));
    console.log("ok");
  }
  lista.push(await segmento({ imagem: fechamento, dur: DUR_FECHAMENTO, movimento: "parado", destino: join(tmp, "seg-99-fechamento.mkv") }));

  // 5. legendas: tempos absolutos (abertura + cenas anteriores)
  let t = DUR_ABERTURA;
  const eventos = [];
  for (const c of cenas) {
    c.inicio = t;
    eventos.push(...blocosLegenda(c.legenda, t, c.duracaoAudio, t + c.dur));
    t += c.dur;
  }
  const ass = join(tmp, "legendas.ass");
  await writeFile(ass, arquivoAss(eventos), "utf8");

  // 6. concatenação + legendas + marca d'água + loudnorm → mp4 final
  const listaTxt = join(tmp, "lista.txt");
  await writeFile(listaTxt, lista.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  await mkdir(dirname(saida), { recursive: true });
  const filtros = [`[0:v]subtitles=filename='${escFiltro(ass)}':fontsdir='${escFiltro(FONTES_DIR)}'[leg]`];
  let ultimo = "[leg]";
  const entradas = ["-f", "concat", "-safe", "0", "-i", listaTxt];
  if (args["sem-marca"] !== true) {
    entradas.push("-i", LOGO);
    filtros.push(`[1:v]scale=260:-1,format=rgba,colorchannelmixer=aa=0.9[wm]`, `[leg][wm]overlay=W-w-40:40[v]`);
    ultimo = "[v]";
  }
  filtros.push(`[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`);
  rodarFfmpeg(
    [
      ...entradas,
      "-filter_complex", filtros.join(";"),
      "-map", ultimo, "-map", "[a]",
      "-r", String(FPS),
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
      "-movflags", "+faststart",
      saida,
    ],
    "montagem final"
  );

  // 7. relatório
  const duracao = duracaoDe(saida);
  const info = spawnSync(ffmpeg, ["-hide_banner", "-i", saida], { encoding: "utf8" }).stderr;
  const res = (info.match(/(\d{3,4})x(\d{3,4})/) || [])[0] || `${W}x${H}`;
  const registro = {
    spec: specPath,
    saida,
    gerado_em: new Date().toISOString(),
    duracao: +duracao.toFixed(2),
    resolucao: res,
    fps: FPS,
    voz,
    abertura: { duracao: DUR_ABERTURA },
    cenas: cenas.map((c) => ({ n: c.n, quem: c.quem, movimento: c.movimento, inicio: +c.inicio.toFixed(2), duracao_audio: +c.duracaoAudio.toFixed(2), duracao: +c.dur.toFixed(2) })),
    fechamento: { inicio: +t.toFixed(2), duracao: DUR_FECHAMENTO },
  };
  await writeFile(saida.replace(/\.mp4$/, "") + ".json", JSON.stringify(registro, null, 2) + "\n");
  console.log(saida);
  console.log(`duração ${duracao.toFixed(2)} s · ${res} · ${FPS} fps`);
}

try {
  await principal();
} catch (e) {
  console.error(`ERRO: ${e.message}`);
  process.exitCode = 1;
} finally {
  if (args["manter-tmp"] === true) console.log(`temporários em ${tmp}`);
  else await rm(tmp, { recursive: true, force: true });
}
