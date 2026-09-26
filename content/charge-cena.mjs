#!/usr/bin/env node
// =============================================================
// charge-cena.mjs — "Charge em cena": monta um Reel 9:16 (1080×1920, 25 fps)
// a partir de um roteiro .cena.json: cartela de abertura com gancho, uma
// cena por ideia (imagem + narração sintetizada ou trecho de áudio real +
// movimento de câmera),
// legendas queimadas em amarelo (estilo Capivara Play), marca d'água do
// HOJE MT e cartela de fechamento com link, fontes e aviso de sátira/IA.
// =============================================================
//
//   node charge-cena.mjs pautas/videos/2026-09-25-paula-em-13-votos.cena.json
//   node charge-cena.mjs <spec.cena.json> --so-audio     só sintetiza as vozes
//   node charge-cena.mjs <spec.cena.json> --sem-marca    sem marca d'água
//   node charge-cena.mjs <spec.cena.json> --manter-tmp   guarda os temporários
//   node charge-cena.mjs <spec.cena.json> --cortar-ate-120
//        se abertura + cenas + fechamento passar de 120 s, remove as últimas
//        cenas (antes do fechamento) até caber, com aviso. Sem a opção, passar
//        de 120 s é ERRO (lista as durações e sugere cortes; nunca acelera voz).
//
// Roteiro (.cena.json): { titulo, materia, universo?, voz:{motor,narrador,
// velocidade}, abertura:{chip,gancho,sub}, cenas:[{n,quem,fala,legenda?,
// imagem,movimento,citacao?,audio_real?}], fechamento:{linha1,leia,fontes,
// aviso}, saida }. `universo` (cenário + figurinos + tom do episódio) é só
// registro: vai para o <saida>.json. Caminhos relativos são relativos a
// content/. Regras editoriais: README.md, pautas/README.md e a ESPEC do formato
// ("Não ataque ninguém"; "Vozes reais, nunca clonadas").
//
// Quem fala em cada cena:
// - `quem: "narrador"` → `fala` sintetizada com a voz do narrador (personagem
//   fictício). O narrador pode LER uma citação real em 3ª pessoa ("Ele
//   lembrou: “…”"); com `citacao: true` (ou `citacao_lida_pelo_narrador:
//   true`) o motor exige a frase entre aspas na legenda.
// - `quem: "<pessoa real>"` → SÓ com `audio_real`: trecho real publicado pela
//   própria pessoa, { arquivo, origem_url, rede, perfil, data (AAAA-MM-DD),
//   inicio, fim (s no vídeo original; no máximo 12 s), transcricao, credito }.
//   `arquivo` pode ser o recorte já feito (pautas/videos/vozes/<pessoa>/
//   <id>-<ini>-<fim>.wav, duração = fim − inicio) ou o áudio inteiro (o motor
//   recorta de inicio a fim). O trecho é normalizado (mede com loudnorm,
//   ganho linear até −16 LUFS + limitador de pico) e entra no lugar da voz
//   sintética; a legenda queimada mostra a `transcricao` entre aspas e a linha
//   de `credito` (Roboto Condensed ~30 px, branco 85%) fica logo acima da
//   legenda durante toda a cena. É PROIBIDO sintetizar
//   voz de pessoa real (Res. TSE 23.610/2019, art. 9º-C): personagem sem
//   `audio_real` é ERRO (`citacao: true` não basta mais); sem trecho real, a
//   frase vai para o narrador em 3ª pessoa. `voz.personagem` não é mais usado.
//
// Trilha: `trilha` no roteiro = {id, volume?} (faixa de assets/trilhas/
// trilhas.json; volume = nível sob a narração, padrão 0,12) ou "nenhuma". Sem o
// campo, casa `universo` com os `universos` das faixas; sem casamento, usa a
// faixa `padrao` do catálogo ("comedia"). Sem catálogo/arquivo: sai sem música,
// com aviso. Mix: faixa normalizada a −16 LUFS, em loop e cortada no total,
// fade in 0,5 s / out 2 s, ducking por envelope (≈ 0,3 nas cartelas, 0,12 sob
// a narração, metade disso sob áudio real), loudnorm final −16 LUFS. O crédito
// ("Música: …", CC BY) vai no fechamento e em `credito_musica` no <saida>.json
// (copiar para a legenda do post).
//
// Duração: abertura + cenas + fechamento ≤ 120 s (ver --cortar-ate-120).
//
// Dependências (nada novo): Node 22 + sharp (node_modules do repo); ffmpeg
// (mesma detecção de reel.mjs: FFMPEG, binário do imageio-ffmpeg ou PATH;
// precisa de libass + zoompan + loudnorm; NÃO usa drawtext); Piper TTS
// (`python3 -m piper`) com as vozes em $HOJEMT_VOZES
// (padrão /root/.local/share/hojemt-vozes); gTTS como reserva. Motor "kokoro"
// (voz do Argos, mais natural): Kokoro-82M em $HOJEMT_VOZES/kokoro, instalado
// por vozes-kokoro.sh; narrador = nome da voz (pm_santa, pm_alex, pf_dora);
// `voz.tom` em semitons (ex.: -2.5 = mais grave). Motor "arquivo": cada cena
// traz `audio_tts` (fala já sintetizada fora, ex.: HeyGen pelo Zapier).
// Fontes: assets/fonts (Anton, Roboto Condensed) via fontconfig gerado em
// tempo de execução — o mesmo truque de lib/card.mjs.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
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
const MAX_AUDIO_REAL = 12; // s: trecho real mais longo aceito (ESPEC)
const MAX_TOTAL = 120; // s: nenhum Reel passa de 2 min (regra do editor; cortar cenas, nunca acelerar voz)
const TRILHAS_JSON = process.env.HOJEMT_TRILHAS || join(aqui, "assets", "trilhas", "trilhas.json"); // catálogo (env só para teste)
const TRILHA_VOLUME = 0.12; // música sob a narração (multiplicador, com a faixa normalizada a −16 LUFS)
const TRILHA_CARTELAS = 2.5; // × volume nas cartelas (≈ 0,3)
const TRILHA_AUDIO_REAL = 0.5; // × volume sob trecho de áudio real (≈ 0,06)
const TRILHA_RAMPA = 0.35; // s de transição entre níveis
const TRILHA_FADE_IN = 0.5;
const TRILHA_FADE_OUT = 2;
const TRILHA_PADRAO = "comedia"; // universo/tema de reserva

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
  console.log("uso: charge-cena.mjs pautas/videos/<spec>.cena.json [--so-audio] [--sem-marca] [--cortar-ate-120] [--manter-tmp]");
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
  { linha1 = "Charge: HOJE MT · hojemt.com.br", leia = "", fontes = [], aviso = AVISO_PADRAO, siga = "Siga @hoje.mt", musica = "" },
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

  if (musica) {
    // crédito obrigatório da trilha (CC BY): Roboto Condensed 30 px, branco 85%
    const musicaLinhas = (await quebrar(`Música: ${musica}`, 980, { fonte: ROBOTO, tamanho: 30 })).slice(0, 4);
    t = linhasSvg(musicaLinhas, { y: t.fim + 30, tamanho: 30, fonte: ROBOTO, opacidade: 0.85, entrelinha: 1.2 });
    partes.push(t.svg);
  }

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
  kokoro(texto, { modelo = "pm_santa", velocidade = 1, tom = 0, destino }) {
    const bruto = Number(tom) ? destino.replace(/\.wav$/, "-bruto.wav") : destino;
    const r = spawnSync("python3", [join(aqui, "lib", "kokoro-tts.py"), "--voz", modelo, "--velocidade", String(Number(velocidade) || 1), "--saida", bruto], {
      input: pronuncia(texto),
      encoding: "utf8",
      env: { ...process.env, HOJEMT_VOZES: VOZES_DIR },
    });
    if (r.status !== 0) throw new Error(`Kokoro falhou: ${r.stderr.trim().split("\n").slice(-2).join(" | ")}`);
    if (bruto !== destino) {
      // `tom` em semitons (negativo = mais grave), com formantes preservados, e
      // tratamento de locutor: corpo em 140 Hz, presença em 3,2 kHz, compressão leve.
      const fator = (2 ** (Number(tom) / 12)).toFixed(4);
      const af = `rubberband=pitch=${fator}:formant=preserved:pitchq=quality,highpass=f=60,equalizer=f=140:t=q:w=1.0:g=2.5,equalizer=f=3200:t=q:w=1.2:g=1.5,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2`;
      rodarFfmpeg(["-i", bruto, "-af", af, "-ar", "24000", destino], "tom da voz");
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

/** Grafia só para a síntese (a legenda continua com a grafia certa). */
const PRONUNCIA = [
  [/\bPivetta\b/g, "Pivéta"],
  [/\bWellington\b/g, "Uélinton"],
  [/\bDatafolha\b/g, "Data Folha"],
  [/\bAtlasIntel\b/g, "Átlas Intel"],
  [/\bJanaina\b/g, "Janaína"],
];
function pronuncia(texto) {
  return PRONUNCIA.reduce((t, [de, para]) => t.replace(de, para), texto.trim());
}

/** Sintetiza uma fala; com Piper indisponível, cai para o gTTS avisando. */
function sintetizar(texto, { motor = "piper", modelo, velocidade, tom, destino }) {
  const fn = motoresVoz[motor];
  if (!fn) throw new Error(`motor de voz desconhecido: ${motor} (use kokoro, piper, gtts, elevenlabs ou heygen)`);
  try {
    return fn(texto, { modelo, velocidade, tom, destino });
  } catch (e) {
    if (motor === "piper" && e.piperIndisponivel) {
      console.warn(`AVISO: ${e.message} — usando gTTS como reserva`);
      return motoresVoz.gtts(texto, { destino });
    }
    throw e;
  }
}

// ---------------------------------------------------------------- áudio real
/** Confere os campos obrigatórios de `audio_real` e devolve a versão normalizada. */
function validarAudioReal(ar, n) {
  const erro = (msg) => new Error(`cena ${n}: audio_real ${msg}`);
  if (!ar || typeof ar !== "object") throw erro("precisa ser um objeto");
  for (const campo of ["arquivo", "origem_url", "rede", "perfil", "data", "transcricao", "credito"])
    if (!String(ar[campo] ?? "").trim()) throw erro(`sem \`${campo}\` (obrigatório: trecho real só entra com origem e crédito)`);
  if (!/^https?:\/\//.test(ar.origem_url)) throw erro(`\`origem_url\` precisa ser a URL pública do post/vídeo original`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ar.data)) throw erro(`\`data\` precisa ser AAAA-MM-DD (data de publicação)`);
  const inicio = Number(ar.inicio);
  const fim = Number(ar.fim);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio < 0 || fim <= inicio)
    throw erro(`\`inicio\`/\`fim\` inválidos (${ar.inicio} → ${ar.fim})`);
  if (fim - inicio > MAX_AUDIO_REAL + 0.05)
    throw erro(`tem ${(fim - inicio).toFixed(2)} s; o máximo é ${MAX_AUDIO_REAL} s`);
  const arquivo = caminho(ar.arquivo);
  if (!existsSync(arquivo)) throw erro(`\`arquivo\` não existe: ${arquivo}`);
  return { ...ar, arquivo, inicio, fim, transcricao: String(ar.transcricao).trim(), credito: String(ar.credito).trim() };
}

/**
 * Recorta (se preciso) e normaliza o trecho real em duas passadas (mede com
 * loudnorm; aplica ganho linear até −16 LUFS e limitador de pico a −1,5 dB),
 * fades curtos contra estalos, wav 48 kHz mono. Aceita o recorte pronto (duração = fim − inicio)
 * ou o áudio inteiro do vídeo (recorta de inicio a fim).
 */
function prepararAudioReal(ar, n, destino) {
  const esperado = ar.fim - ar.inicio;
  const total = duracaoDe(ar.arquivo);
  let ss;
  if (total >= ar.fim - 0.05) ss = ar.inicio; // áudio inteiro: recorta
  else if (Math.abs(total - esperado) <= 0.35) ss = 0; // recorte pronto
  else
    throw new Error(
      `cena ${n}: audio_real \`arquivo\` tem ${total.toFixed(2)} s, que não bate nem com o recorte (${esperado.toFixed(2)} s) nem com o vídeo inteiro (≥ ${ar.fim} s)`
    );
  const dur = Math.min(ss === 0 ? total : esperado, MAX_AUDIO_REAL);
  const corte = ["-ss", ss.toFixed(3), "-t", dur.toFixed(3), "-i", ar.arquivo];
  const alvo = "I=-16:TP=-1.5:LRA=11";

  // 1ª passada: medir
  const r = spawnSync(ffmpeg, ["-hide_banner", "-nostats", ...corte, "-af", `loudnorm=${alvo}:print_format=json`, "-f", "null", "-"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  let medida = null;
  const json = (r.stderr || "").match(/\{[^{}]*"input_i"[^{}]*\}/);
  if (json) {
    try {
      medida = JSON.parse(json[0]);
    } catch {
      medida = null;
    }
  }
  const entradaI = Number(medida?.input_i);
  if (medida && (/inf/i.test(String(medida.input_i)) || entradaI < -60))
    throw new Error(`cena ${n}: audio_real sem voz audível no trecho ${ar.inicio}–${ar.fim} s (${medida.input_i} LUFS)`);
  // ganho linear até −16 LUFS + limitador de pico (−1,5 dB); o loudnorm em modo
  // linear desiste (vira dinâmico) quando o pico estouraria, e fica baixo demais
  const norm = Number.isFinite(entradaI)
    ? `aresample=48000,volume=${Math.max(-20, Math.min(30, -16 - entradaI)).toFixed(2)}dB,alimiter=limit=0.84:level=false:latency=true`
    : `loudnorm=${alvo},aresample=48000`;
  if (!Number.isFinite(entradaI)) console.warn(`AVISO: cena ${n}: não consegui medir o volume do trecho real; usando loudnorm de uma passada`);

  // 2ª passada: corrigir + fades
  const fadeOut = Math.max(0, dur - 0.06).toFixed(3);
  rodarFfmpeg(
    [...corte, "-af", `${norm},afade=t=in:d=0.02,afade=t=out:st=${fadeOut}:d=0.06`, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", destino],
    `áudio real da cena ${n}`
  );
  return destino;
}

// ---------------------------------------------------------------- trilha musical
const semAcento = (x) =>
  String(x ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Escolhe a trilha do vídeo. `spec.trilha` = {id, volume?} (faixa pedida) ou
 * "nenhuma"; sem o campo, a faixa cujo item de `universos` aparece mais cedo
 * no texto de `spec.universo` (empate: o item mais longo); sem casamento, uma
 * faixa de universo/tema "comedia". Catálogo: assets/trilhas/trilhas.json
 * ({faixas:[{id, arquivo (relativo a content/), titulo, credito, universos,
 * temas}]}). Sem catálogo/arquivo: devolve null e o vídeo sai sem música.
 */
async function escolherTrilha(spec) {
  const pedido = spec.trilha;
  if (pedido === "nenhuma" || pedido === false || pedido?.id === "nenhuma") {
    console.log("trilha: nenhuma (pedido do roteiro)");
    return null;
  }
  const semMusica = (motivo) => {
    console.warn(`AVISO: ${motivo} — vídeo sem música`);
    return null;
  };
  if (!existsSync(TRILHAS_JSON)) return semMusica(`catálogo de trilhas não existe (${TRILHAS_JSON.startsWith(aqui + "/") ? relative(aqui, TRILHAS_JSON) : TRILHAS_JSON})`);
  let faixas;
  let padrao = TRILHA_PADRAO;
  try {
    const catalogo = JSON.parse(await readFile(TRILHAS_JSON, "utf8"));
    faixas = catalogo.faixas;
    if (catalogo.padrao) padrao = String(catalogo.padrao);
  } catch (e) {
    return semMusica(`catálogo de trilhas ilegível (${e.message})`);
  }
  if (!Array.isArray(faixas) || !faixas.length) return semMusica("catálogo de trilhas vazio");

  let faixa;
  let escolha;
  if (pedido?.id) {
    faixa = faixas.find((f) => f.id === pedido.id);
    if (!faixa) return semMusica(`trilha "${pedido.id}" não está no catálogo`);
    escolha = "roteiro";
  } else {
    const universo = semAcento(spec.universo);
    let melhor = null;
    for (const f of faixas)
      for (const u of f.universos || []) {
        const chave = semAcento(u).trim();
        const pos = chave ? universo.indexOf(chave) : -1;
        if (pos < 0) continue;
        if (!melhor || pos < melhor.pos || (pos === melhor.pos && chave.length > melhor.len)) melhor = { f, pos, len: chave.length };
      }
    if (melhor) {
      faixa = melhor.f;
      escolha = "universo";
    } else {
      const reserva = (lista) => (lista || []).some((x) => semAcento(x) === semAcento(padrao));
      faixa = faixas.find((f) => f.id === padrao) || faixas.find((f) => reserva(f.universos)) || faixas.find((f) => reserva(f.temas));
      escolha = "padrao";
      if (!faixa) return semMusica(`nenhuma trilha casa com o universo e não há faixa "${padrao}"`);
    }
  }
  const arquivo = caminho(faixa.arquivo);
  if (!faixa.arquivo || !existsSync(arquivo)) return semMusica(`arquivo da trilha "${faixa.id}" não existe (${faixa.arquivo})`);
  if (!String(faixa.credito || "").trim()) return semMusica(`trilha "${faixa.id}" sem \`credito\` (obrigatório: licença CC BY)`);
  const volume = Number(pedido?.volume) > 0 ? Math.min(1, Number(pedido.volume)) : TRILHA_VOLUME;
  // crédito sempre começando por "Música:" (o catálogo já traz; não duplicar)
  const credito = String(faixa.credito).trim().replace(/^m[úu]sica:\s*/i, "");
  console.log(`trilha: ${faixa.id} (${escolha}) · volume ${volume} · Música: ${credito}`);
  return { id: faixa.id, titulo: faixa.titulo || faixa.id, arquivo, credito, volume, escolha, licenca: faixa.licenca || null, credito_oficial: faixa.credito_oficial || null };
}

/** Ganho (dB) para levar a faixa a −16 LUFS integrados (medido com loudnorm). */
function ganhoTrilha(arquivo) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-nostats", "-i", arquivo, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const json = (r.stderr || "").match(/\{[^{}]*"input_i"[^{}]*\}/);
  const i = json ? Number(JSON.parse(json[0]).input_i) : NaN;
  return Number.isFinite(i) ? Math.max(-20, Math.min(20, -16 - i)) : 0;
}

/**
 * Envelope de volume da música (expressão do filtro volume, eval=frame):
 * nível alto nas cartelas, baixo sob a narração, mais baixo sob áudio real,
 * com rampas de TRILHA_RAMPA s (desce antes da fala começar, sobe depois).
 */
function envelopeTrilha(trechos) {
  let expr = trechos[0].nivel.toFixed(4);
  for (let i = 1; i < trechos.length; i++) {
    const delta = trechos[i].nivel - trechos[i - 1].nivel;
    if (Math.abs(delta) < 1e-6) continue;
    const inicio = delta < 0 ? Math.max(0, trechos[i].inicio - TRILHA_RAMPA) : trechos[i].inicio;
    expr += `+(${delta.toFixed(4)})*clip((t-${inicio.toFixed(3)})/${TRILHA_RAMPA},0,1)`;
  }
  return expr;
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

/** Altura (px, PlayRes) de uma linha da legenda (Anton 90 no libass) e posição dela. */
const LEGENDA_TAM = 90;
const LEGENDA_MARGEM_V = 430;
const CREDITO_TAM = 34; // corpo ASS ≈ 30 px CSS de Roboto Condensed

/**
 * Linha de crédito do áudio real: acima da legenda da cena (constante durante
 * a cena, calculada pelo bloco de legenda mais alto), sem subir até o rosto.
 */
function eventoCredito(texto, inicio, fim, linhasLegenda) {
  const margemV = LEGENDA_MARGEM_V + Math.max(1, linhasLegenda) * LEGENDA_TAM + 22;
  return { estilo: "Credito", camada: 1, inicio, fim, margemV, texto: texto.replace(/\s+/g, " ").trim() };
}

function arquivoAss(eventos) {
  const temCredito = eventos.some((e) => e.estilo === "Credito");
  const estiloCredito = temCredito
    ? `Style: Credito,${ROBOTO},${CREDITO_TAM},&H26FFFFFF,&H26FFFFFF,&H4D000000,&H80000000,0,0,0,0,100,100,0.5,0,1,2,1,2,60,60,${LEGENDA_MARGEM_V + LEGENDA_TAM + 22},1\n`
    : "";
  const cabecalho = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cena,Anton,${LEGENDA_TAM},&H0000D4FF,&H0000D4FF,&H00000000,&H80000000,0,0,0,0,100,100,1,0,1,6,2,2,50,50,${LEGENDA_MARGEM_V},1
${estiloCredito}
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const linhas = eventos.map((e) =>
    e.estilo === "Credito"
      ? `Dialogue: ${e.camada},${tempoAss(e.inicio)},${tempoAss(e.fim)},Credito,,0,0,${e.margemV},,{\\an2}${e.texto.replace(/[{}]/g, "")}`
      : `Dialogue: 0,${tempoAss(e.inicio)},${tempoAss(e.fim)},Cena,,0,0,0,,{\\an2}${e.texto.replace(/[{}]/g, "")}`
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
  const voz = { motor: "piper", narrador: "pt_BR-faber-medium", velocidade: 1.0, ...(spec.voz || {}) };

  // 1. vozes: narrador sintetizado; pessoa real só com trecho real (audio_real)
  const cenas = [];
  for (const [i, c] of spec.cenas.entries()) {
    const n = c.n ?? i + 1;
    const quem = String(c.quem || "narrador").trim();
    const ehNarrador = quem.toLowerCase() === "narrador";
    const destino = join(tmp, `cena-${String(n).padStart(2, "0")}.wav`);
    const base = { n, quem, imagem: c.imagem, movimento: c.movimento || "zoom-in" };
    let cena;
    if (c.audio_real) {
      if (ehNarrador)
        throw new Error(`cena ${n}: \`audio_real\` é a voz da própria pessoa: \`quem\` precisa ser o nome dela, não "narrador"`);
      const ar = validarAudioReal(c.audio_real, n);
      if (c.legenda && c.legenda.trim() !== ar.transcricao)
        console.warn(`AVISO: cena ${n}: \`legenda\` ignorada; com audio_real a legenda é a \`transcricao\``);
      process.stdout.write(`voz ${n} (${quem}, áudio real ${basename(ar.arquivo)} ${ar.inicio}–${ar.fim} s)… `);
      const audio = prepararAudioReal(ar, n, destino);
      const transcricao = ar.transcricao.replace(/^["“”]+|["“”]+$/g, "").trim();
      cena = { ...base, fala: ar.transcricao, legenda: `“${transcricao}”`, audio, audioReal: ar };
    } else {
      if (!ehNarrador)
        throw new Error(
          `cena ${n}: "${quem}" é pessoa real e só fala com \`audio_real\` (trecho real publicado por ela, ≤ ${MAX_AUDIO_REAL} s, com crédito). ` +
            `É proibido sintetizar voz de pessoa real (Res. TSE 23.610/2019, art. 9º-C), mesmo com \`citacao: true\`; ` +
            `sem trecho real, passe a frase ao narrador em 3ª pessoa (ex.: "Ele lembrou: “…”").`
        );
      const fala = String(c.fala || "").trim();
      if (!fala) throw new Error(`cena ${n}: falta \`fala\``);
      const legenda = c.legenda || fala;
      if ((c.citacao === true || c.citacao_lida_pelo_narrador === true) && !/["“«][^"“”«»]{3,}["”»]/.test(legenda))
        throw new Error(`cena ${n}: citação lida pelo narrador precisa da frase real entre aspas na legenda (\`legenda\` ou \`fala\`)`);
      const modelo = voz.motor === "arquivo" ? "audio_tts" : voz.narrador;
      process.stdout.write(`voz ${n} (${quem}, ${voz.motor}/${modelo})… `);
      let audio;
      if (voz.motor === "arquivo") {
        // Fala já sintetizada fora daqui (ex.: voz do HeyGen baixada pelo Zapier):
        // `audio_tts` em cada cena, relativo a content/. Só voz sintética genérica.
        if (!c.audio_tts) throw new Error(`cena ${n}: com voz.motor "arquivo", cada cena do narrador precisa de \`audio_tts\``);
        const origem = isAbsolute(c.audio_tts) ? c.audio_tts : join(aqui, c.audio_tts);
        if (!existsSync(origem)) throw new Error(`cena ${n}: audio_tts não encontrado: ${c.audio_tts}`);
        rodarFfmpeg(["-i", origem, "-ac", "1", "-ar", "24000", destino], `voz pronta da cena ${n}`);
        audio = destino;
      } else {
        audio = sintetizar(fala, { motor: voz.motor, modelo, velocidade: c.velocidade ?? voz.velocidade, tom: voz.tom, destino });
      }
      cena = { ...base, fala, legenda, audio };
    }
    cena.duracaoAudio = duracaoDe(cena.audio);
    cena.dur = Math.max(DUR_MIN_CENA, cena.duracaoAudio + FOLGA_CENA);
    console.log(`${cena.duracaoAudio.toFixed(2)} s → cena ${cena.dur.toFixed(2)} s`);
    cenas.push(cena);
  }

  // 1b. limite de duração: abertura + cenas + fechamento ≤ 120 s
  const totalPrevisto = (lista) => DUR_ABERTURA + lista.reduce((soma, c) => soma + c.dur, 0) + DUR_FECHAMENTO;
  const cenasCortadas = [];
  if (totalPrevisto(cenas) > MAX_TOTAL) {
    const tabela = cenas.map((c) => `  cena ${c.n} (${c.quem}): ${c.dur.toFixed(2)} s`).join("\n");
    const sobra = [...cenas];
    const sugeridas = [];
    while (sobra.length > 1 && totalPrevisto(sobra) > MAX_TOTAL) sugeridas.push(sobra.pop().n);
    const maiores = [...cenas].sort((a, b) => b.dur - a.dur).slice(0, 3).map((c) => `${c.n} (${c.dur.toFixed(1)} s)`);
    const resumo =
      `duração prevista ${totalPrevisto(cenas).toFixed(2)} s passa do limite de ${MAX_TOTAL} s ` +
      `(abertura ${DUR_ABERTURA} s + cenas + fechamento ${DUR_FECHAMENTO} s):\n${tabela}\n` +
      `Sugestão: cortar as últimas cenas antes do fechamento (${sugeridas.join(", ")}) ou encurtar/juntar as mais longas (${maiores.join(", ")}); nunca acelerar a voz.`;
    if (args["cortar-ate-120"] === true && args["so-audio"] !== true) {
      while (cenas.length > 1 && totalPrevisto(cenas) > MAX_TOTAL) cenasCortadas.unshift(cenas.pop().n);
      console.warn(`AVISO: ${resumo}\n--cortar-ate-120: cenas removidas: ${cenasCortadas.join(", ")} → ${totalPrevisto(cenas).toFixed(2)} s`);
      if (totalPrevisto(cenas) > MAX_TOTAL) throw new Error(`mesmo só com a cena ${cenas[0].n} o vídeo passa de ${MAX_TOTAL} s`);
    } else if (args["so-audio"] === true) {
      console.warn(`AVISO: ${resumo}`);
    } else {
      throw new Error(`${resumo}\nPara cortar automaticamente as últimas cenas, rode de novo com --cortar-ate-120.`);
    }
  }
  console.log(`duração prevista: ${totalPrevisto(cenas).toFixed(2)} s (limite ${MAX_TOTAL} s)`);

  if (args["so-audio"] === true) {
    const pasta = saida.replace(/\.mp4$/, "") + "-voz";
    await mkdir(pasta, { recursive: true });
    for (const c of cenas) {
      const alvo = join(pasta, basename(c.audio));
      await writeFile(alvo, await readFile(c.audio));
      c.audio = alvo;
    }
    console.log(`áudios em ${pasta}`);
    console.log(JSON.stringify(cenas.map((c) => ({ n: c.n, quem: c.quem, voz: c.audioReal ? "audio_real" : "sintetica", duracao_audio: +c.duracaoAudio.toFixed(2), duracao_cena: +c.dur.toFixed(2), audio: c.audio })), null, 2));
    return;
  }

  // 2. imagens das cenas precisam existir
  for (const c of cenas) {
    if (!c.imagem) throw new Error(`cena ${c.n}: falta \`imagem\``);
    c.imagem = caminho(c.imagem);
    if (!existsSync(c.imagem)) throw new Error(`cena ${c.n}: imagem não existe: ${c.imagem}`);
  }

  // 3. trilha + cartelas (o crédito da música vai no fechamento)
  const trilha = await escolherTrilha(spec);
  const abertura = join(tmp, "abertura.png");
  const fechamento = join(tmp, "fechamento.png");
  await cartelaAbertura(spec.abertura || { gancho: spec.titulo || "" }, abertura);
  await cartelaFechamento(
    {
      leia: spec.materia ? spec.materia.replace(/^https?:\/\//, "").replace(/\/$/, "") : "",
      ...(spec.fechamento || {}),
      musica: trilha ? trilha.credito : "",
    },
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
    const blocos = blocosLegenda(c.legenda, t, c.duracaoAudio, t + c.dur);
    eventos.push(...blocos);
    if (c.audioReal) {
      const linhasLegenda = Math.max(...blocos.map((b) => b.texto.split("\\N").length));
      const credito = quebrarChars(c.audioReal.credito, 58).join("\\N");
      eventos.push(eventoCredito(credito, t, t + c.dur, linhasLegenda));
    }
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
  if (trilha) {
    // música em loop, cortada na duração total, por baixo das vozes (ducking por envelope)
    const total = t + DUR_FECHAMENTO;
    const trechos = [{ inicio: 0, nivel: trilha.volume * TRILHA_CARTELAS }];
    for (const c of cenas) trechos.push({ inicio: c.inicio, nivel: trilha.volume * (c.audioReal ? TRILHA_AUDIO_REAL : 1) });
    trechos.push({ inicio: t, nivel: trilha.volume * TRILHA_CARTELAS });
    const idx = args["sem-marca"] !== true ? 2 : 1;
    entradas.push("-stream_loop", "-1", "-i", trilha.arquivo);
    const ganho = ganhoTrilha(trilha.arquivo);
    filtros.push(
      `[${idx}:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
        `volume=${ganho.toFixed(2)}dB,volume='${envelopeTrilha(trechos)}':eval=frame,` +
        `afade=t=in:st=0:d=${TRILHA_FADE_IN},afade=t=out:st=${Math.max(0, total - TRILHA_FADE_OUT).toFixed(3)}:d=${TRILHA_FADE_OUT}[mus]`,
      `[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[vox]`,
      `[vox][mus]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`
    );
    trilha.ganho_db = +ganho.toFixed(2);
  } else {
    filtros.push(`[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`);
  }
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
    duracao_total: +duracao.toFixed(2),
    limite_duracao: MAX_TOTAL,
    ...(cenasCortadas.length ? { cenas_cortadas: cenasCortadas } : {}),
    resolucao: res,
    fps: FPS,
    ...(spec.universo ? { universo: spec.universo } : {}),
    trilha: trilha
      ? {
          id: trilha.id,
          titulo: trilha.titulo,
          arquivo: relative(aqui, trilha.arquivo),
          escolha: trilha.escolha,
          volume: trilha.volume,
          ganho_db: trilha.ganho_db,
          licenca: trilha.licenca,
          credito: `Música: ${trilha.credito}`,
          credito_oficial: trilha.credito_oficial,
        }
      : null,
    credito_musica: trilha ? `Música: ${trilha.credito}` : null,
    voz,
    abertura: { duracao: DUR_ABERTURA },
    cenas: cenas.map((c) => ({
      n: c.n,
      quem: c.quem,
      voz: c.audioReal ? "audio_real" : "sintetica",
      movimento: c.movimento,
      inicio: +c.inicio.toFixed(2),
      duracao_audio: +c.duracaoAudio.toFixed(2),
      duracao: +c.dur.toFixed(2),
      ...(c.audioReal
        ? {
            audio_real: {
              arquivo: c.audioReal.arquivo.startsWith(aqui + "/") ? relative(aqui, c.audioReal.arquivo) : c.audioReal.arquivo,
              origem_url: c.audioReal.origem_url,
              rede: c.audioReal.rede,
              perfil: c.audioReal.perfil,
              data: c.audioReal.data,
              inicio: c.audioReal.inicio,
              fim: c.audioReal.fim,
              transcricao: c.audioReal.transcricao,
              credito: c.audioReal.credito,
            },
          }
        : {}),
    })),
    fechamento: { inicio: +t.toFixed(2), duracao: DUR_FECHAMENTO },
  };
  await writeFile(saida.replace(/\.mp4$/, "") + ".json", JSON.stringify(registro, null, 2) + "\n");
  console.log(saida);
  console.log(`duração ${duracao.toFixed(2)} s · ${res} · ${FPS} fps`);
  if (trilha) console.log(`crédito para a legenda do post: Música: ${trilha.credito}`);
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
