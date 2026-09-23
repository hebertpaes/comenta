// =============================================================
// card.mjs — card de notícia 1080×1350 (Instagram) gerado por código
// =============================================================
// Reproduz o padrão do HOJE MT usado nos cards da série ONU: fundo verde
// escuro, chapéu verde, manchete em Anton, barra vertical, sublinha, linha,
// rodapé com fontes e crédito, e retrato(s) em círculo no canto superior
// direito quando houver foto licenciada.
//
// Tudo é SVG renderizado pelo sharp; as fontes livres (Anton, Roboto Condensed,
// licença OFL) estão em content/assets/fonts e entram por um fontconfig gerado
// em tempo de execução — sem depender do que o servidor tem instalado.
// As quebras de linha usam a largura REAL do texto (renderiza e mede), não
// estimativa por caractere.
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FONTES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts");
const VERDE = "#06a14e";
const ANTON = "Anton";
const ROBOTO = "Roboto Condensed";

let sharpMod;
/** Aponta o fontconfig para as fontes do projeto e carrega o sharp. */
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
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

const cacheMedidas = new Map();
/** Largura real (px) de `texto` numa fonte: renderiza em transparente e mede a tinta. */
export async function medir(
  texto,
  { fonte = ROBOTO, tamanho = 40, peso = "normal", espacamento = 0 } = {}
) {
  const chave = `${fonte}|${tamanho}|${peso}|${espacamento}|${texto}`;
  if (cacheMedidas.has(chave)) return cacheMedidas.get(chave);
  const sharp = await sharpComFontes();
  const larguraMax = Math.ceil(texto.length * tamanho * 1.2) + 50;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${larguraMax}" height="${Math.ceil(tamanho * 1.6)}"><text x="10" y="${Math.round(tamanho * 1.1)}" font-family="${fonte}" font-size="${tamanho}" font-weight="${peso}" letter-spacing="${espacamento}" fill="#fff">${esc(texto)}</text></svg>`;
  let w;
  try {
    const { info } = await sharp(Buffer.from(svg)).trim().toBuffer({ resolveWithObject: true });
    w = info.width;
  } catch {
    w = texto.length * tamanho * 0.5; // texto vazio ou só espaços
  }
  cacheMedidas.set(chave, w);
  return w;
}

/** Quebra `texto` em linhas que cabem em `larguraPx`, medindo de verdade. */
export async function quebrar(texto, larguraPx, opts) {
  const palavras = String(texto).trim().split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = "";
  for (const p of palavras) {
    const tent = atual ? `${atual} ${p}` : p;
    if (atual && (await medir(tent, opts)) > larguraPx) {
      linhas.push(atual);
      atual = p;
    } else atual = tent;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Maior corpo da manchete que cabe em até `maxLinhas`. */
async function ajustaManchete(texto, larguraPx, maxLinhas = 3) {
  for (const tamanho of [130, 118, 108, 98, 90, 82, 74]) {
    const linhas = await quebrar(texto, larguraPx, { fonte: ANTON, tamanho, espacamento: -2 });
    if (linhas.length <= maxLinhas) return { tamanho, linhas };
  }
  const linhas = await quebrar(texto, larguraPx, { fonte: ANTON, tamanho: 74, espacamento: -2 });
  return { tamanho: 74, linhas: linhas.slice(0, 4) };
}

/** Rodapé: encolhe o corpo até caber; se nem 22 px bastar, corta com reticências. */
async function ajustaRodape(linhas, larguraPx) {
  for (const tamanho of [27, 25, 23, 22]) {
    const larguras = await Promise.all(linhas.map((l) => medir(l, { fonte: ROBOTO, tamanho })));
    if (larguras.every((w) => w <= larguraPx)) return { tamanho, linhas };
  }
  const cortadas = [];
  for (const l of linhas) {
    let t = l;
    while (t.length > 10 && (await medir(`${t}…`, { fonte: ROBOTO, tamanho: 22 })) > larguraPx)
      t = t.slice(0, -4);
    cortadas.push(t === l ? l : `${t}…`);
  }
  return { tamanho: 22, linhas: cortadas };
}

/**
 * Gera o card. `fotos` são PNGs já redondos (Buffer ou caminho) — use
 * `circulo()` de imagens.mjs. Devolve Buffer (jpeg por padrão).
 */
export async function gerarCard(
  {
    chapeu = "",
    manchete = "",
    sublinha = "",
    fontes = "",
    creditoFoto = "",
    fotos = [],
    marca = "Hoje MT",
    secao = "Notícias",
    site = "hojemt.com.br",
  },
  { formato = "jpeg", qualidade = 92 } = {}
) {
  const sharp = await sharpComFontes();
  const W = 1080,
    H = 1350;

  const m = await ajustaManchete(manchete, 840, 3);
  const linhaM = m.tamanho * 1.15;
  const manchetePartes = m.linhas
    .map(
      (l, i) =>
        `<text x="108" y="${273 + m.tamanho * 0.92 + i * linhaM}" font-family="${ANTON}" font-size="${m.tamanho}" letter-spacing="-2" fill="#fff">${esc(l)}</text>`
    )
    .join("");
  const fimManchete = 273 + m.linhas.length * linhaM;

  const subTamanho = 49;
  const subLinhas = (await quebrar(sublinha, 864, { fonte: ROBOTO, tamanho: subTamanho })).slice(
    0,
    5
  );
  const subTop = Math.max(906, fimManchete + 60);
  const subPartes = subLinhas
    .map(
      (l, i) =>
        `<text x="108" y="${subTop + subTamanho * 0.9 + i * subTamanho * 1.15}" font-family="${ROBOTO}" font-size="${subTamanho}" fill="#fff" fill-opacity="0.85">${esc(l)}</text>`
    )
    .join("");

  const rodape1 = fontes ? `Fontes: ${fontes}` : "";
  const brutas = creditoFoto
    ? [rodape1, [creditoFoto, site].filter(Boolean).join("  |  ")]
    : [[rodape1, site].filter(Boolean).join("  |  ")];
  const rod = await ajustaRodape(brutas.filter(Boolean), 953);
  const rodPartes = rod.linhas
    .map(
      (l, i) =>
        `<text x="75" y="${1258 + rod.tamanho * 0.9 + i * rod.tamanho * 1.2}" font-family="${ROBOTO}" font-size="${rod.tamanho}" fill="#fff" fill-opacity="0.85">${esc(l)}</text>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="bg" cx="30%" cy="20%" r="110%">
      <stop offset="0" stop-color="#0f3a20"/><stop offset="0.55" stop-color="#08271a"/><stop offset="1" stop-color="#041a10"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="75" y="84" font-family="${ROBOTO}" font-weight="bold" font-size="37" fill="#fff" letter-spacing="-0.5">${esc(marca)}</text>
  <rect x="242" y="68" width="140" height="2" fill="${VERDE}"/>
  <text x="389" y="82" font-family="${ROBOTO}" font-size="27" fill="#fff" letter-spacing="3">${esc(secao.toUpperCase())}</text>
  <text x="75" y="243" font-family="${ROBOTO}" font-weight="bold" font-size="34" fill="${VERDE}" letter-spacing="5">${esc(chapeu.toUpperCase())}</text>
  <rect x="66" y="318" width="14" height="585" fill="${VERDE}"/>
  ${manchetePartes}
  ${subPartes}
  <rect x="63" y="1229" width="954" height="2" fill="${VERDE}" fill-opacity="0.7"/>
  ${rodPartes}
</svg>`;

  // retratos: 1 → círculo de 220 no canto; 2 → dois de 170 lado a lado
  const camadas = [];
  const lista = fotos.slice(0, 2);
  if (lista.length === 1)
    camadas.push({
      input: await sharp(lista[0]).resize(248, 248).png().toBuffer(),
      left: 792,
      top: 30,
    });
  if (lista.length === 2) {
    camadas.push({
      input: await sharp(lista[0]).resize(198, 198).png().toBuffer(),
      left: 660,
      top: 20,
    });
    camadas.push({
      input: await sharp(lista[1]).resize(198, 198).png().toBuffer(),
      left: 842,
      top: 20,
    });
  }

  let img = sharp(Buffer.from(svg)).composite(camadas);
  img =
    formato === "webp"
      ? img.webp({ quality: qualidade })
      : formato === "png"
        ? img.png()
        : img.jpeg({ quality: qualidade, mozjpeg: true });
  return img.toBuffer();
}
