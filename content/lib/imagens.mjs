// =============================================================
// imagens.mjs — busca de fotos REAIS em bancos livres, com licença e crédito
// =============================================================
// Devolve só imagens que podem ser publicadas com atribuição: Creative Commons
// BY / BY-SA / CC0, domínio público e as licenças próprias de Pexels, Pixabay e
// Unsplash. Cada resultado já vem com a linha de crédito pronta para o card.
//
// Bancos:
//   openverse   sem chave — agrega Flickr, Wikimedia, museus etc. (só CC/PD)
//   wikimedia   sem chave — Commons (retratos oficiais, fotos de agência CC)
//   pexels      PEXELS_API_KEY      (grátis em https://www.pexels.com/api/)
//   pixabay     PIXABAY_API_KEY     (grátis em https://pixabay.com/api/docs/)
//   unsplash    UNSPLASH_ACCESS_KEY (grátis em https://unsplash.com/developers)
//
// Regra editorial: foto de agência/banco ilustra; nunca vira "foto do fato" sem
// legenda dizendo o que é. Crédito sempre no card (content/pautas/README.md).

const UA = "HojeMT-redacao/1.0 (+https://hojemt.com.br; redacao@hojemt.com.br)";

/** Licenças aceitas (chave normalizada → rótulo curto). */
const LICENCAS = {
  cc0: "CC0",
  pdm: "Domínio público",
  "public domain": "Domínio público",
  by: "CC BY",
  "by-sa": "CC BY-SA",
  pexels: "Licença Pexels",
  pixabay: "Licença Pixabay",
  unsplash: "Licença Unsplash",
};

function normalizaLicenca(bruta = "", versao = "") {
  const s = String(bruta).trim().toLowerCase();
  if (!s) return null;
  if (/cc0|zero/.test(s)) return "CC0";
  if (/public domain|pdm|domínio público|dominio publico/.test(s)) return "Domínio público";
  if (/^(cc[ -])?by[ -]sa/.test(s)) return `CC BY-SA${versao ? " " + versao : ""}`.trim();
  if (/^(cc[ -])?by(\s|$|\s?\d)/.test(s) || s === "by")
    return `CC BY${versao ? " " + versao : ""}`.trim();
  if (/attribution$/.test(s)) return "Atribuição";
  // NC / ND / GFDL / "fair use" / "copyrighted" → não usar
  return null;
}

async function json(url, headers = {}) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
  });
  if (!r.ok) throw new Error(`${new URL(url).hostname} respondeu ${r.status}`);
  return r.json();
}

// --- bancos --------------------------------------------------------------

async function openverse(q, n) {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", q);
  u.searchParams.set("license_type", "commercial");
  u.searchParams.set("page_size", String(Math.min(n, 20)));
  const d = await json(u);
  return (d.results || []).map((x) => ({
    fonte: `Openverse/${x.source || "?"}`,
    titulo: x.title || "",
    url: x.url,
    thumb: x.thumbnail || x.url,
    largura: x.width,
    altura: x.height,
    autor: x.creator || "",
    autorUrl: x.creator_url || "",
    licenca: normalizaLicenca(x.license, x.license_version),
    licencaUrl: x.license_url || "",
    pagina: x.foreign_landing_url || "",
  }));
}

async function wikimedia(q, n) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({
    action: "query",
    generator: "search",
    gsrsearch: q,
    gsrnamespace: "6",
    gsrlimit: String(Math.min(n, 20)),
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "1600",
    format: "json",
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  const d = await json(u);
  const strip = (s = "") => {
    const t = String(s)
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    // spans aninhados do Commons repetem o texto ("Unknown authorUnknown author")
    const metade = t.slice(0, Math.floor(t.length / 2));
    const limpo = t.length % 2 === 0 && t === metade + metade ? metade : t;
    return /unknown author|autor desconhecido/i.test(limpo) ? "autor desconhecido" : limpo;
  };
  const FOTO = /\.(jpe?g|png|webp|tiff?)$/i;
  return Object.values(d.query?.pages || {})
    .filter((p) => FOTO.test(p.title || ""))
    .map((p) => {
      const ii = p.imageinfo?.[0] || {};
      const em = ii.extmetadata || {};
      const lic = em.LicenseShortName?.value || "";
      return {
        fonte: "Wikimedia Commons",
        titulo: p.title?.replace(/^File:/, "") || "",
        url: ii.thumburl || ii.url,
        thumb: ii.thumburl || ii.url,
        largura: ii.thumbwidth || ii.width,
        altura: ii.thumbheight || ii.height,
        autor: strip(em.Artist?.value) || strip(em.Credit?.value),
        autorUrl: "",
        licenca: normalizaLicenca(lic),
        licencaUrl: em.LicenseUrl?.value || "",
        pagina: ii.descriptionurl || "",
      };
    });
}

async function pexels(q, n) {
  const chave = process.env.PEXELS_API_KEY;
  if (!chave) throw new Error("sem PEXELS_API_KEY");
  const u = new URL("https://api.pexels.com/v1/search");
  u.searchParams.set("query", q);
  u.searchParams.set("per_page", String(Math.min(n, 30)));
  const d = await json(u, { Authorization: chave });
  return (d.photos || []).map((x) => ({
    fonte: "Pexels",
    titulo: x.alt || "",
    url: x.src?.large2x || x.src?.original,
    thumb: x.src?.medium,
    largura: x.width,
    altura: x.height,
    autor: x.photographer || "",
    autorUrl: x.photographer_url || "",
    licenca: LICENCAS.pexels,
    licencaUrl: "https://www.pexels.com/license/",
    pagina: x.url,
  }));
}

async function pixabay(q, n) {
  const chave = process.env.PIXABAY_API_KEY;
  if (!chave) throw new Error("sem PIXABAY_API_KEY");
  const u = new URL("https://pixabay.com/api/");
  u.searchParams.set("key", chave);
  u.searchParams.set("q", q);
  u.searchParams.set("image_type", "photo");
  u.searchParams.set("per_page", String(Math.max(3, Math.min(n, 30))));
  const d = await json(u);
  return (d.hits || []).map((x) => ({
    fonte: "Pixabay",
    titulo: x.tags || "",
    url: x.largeImageURL,
    thumb: x.webformatURL,
    largura: x.imageWidth,
    altura: x.imageHeight,
    autor: x.user || "",
    autorUrl: x.user_id ? `https://pixabay.com/users/${x.user}-${x.user_id}/` : "",
    licenca: LICENCAS.pixabay,
    licencaUrl: "https://pixabay.com/service/license-summary/",
    pagina: x.pageURL,
  }));
}

async function unsplash(q, n) {
  const chave = process.env.UNSPLASH_ACCESS_KEY;
  if (!chave) throw new Error("sem UNSPLASH_ACCESS_KEY");
  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", q);
  u.searchParams.set("per_page", String(Math.min(n, 30)));
  const d = await json(u, { Authorization: `Client-ID ${chave}`, "Accept-Version": "v1" });
  return (d.results || []).map((x) => ({
    fonte: "Unsplash",
    titulo: x.alt_description || x.description || "",
    url: x.urls?.regular,
    thumb: x.urls?.small,
    largura: x.width,
    altura: x.height,
    autor: x.user?.name || "",
    autorUrl: x.user?.links?.html || "",
    licenca: LICENCAS.unsplash,
    licencaUrl: "https://unsplash.com/license",
    pagina: x.links?.html,
    // a API da Unsplash exige avisar o download quando a foto é usada
    downloadPing: x.links?.download_location,
  }));
}

export const BANCOS = { openverse, wikimedia, pexels, pixabay, unsplash };

/** Linha de crédito para o rodapé do card. */
export function credito(img) {
  const quem = img.autor ? `${img.autor}/${img.fonte.replace(/^Openverse\//, "")}` : img.fonte;
  return `Foto: ${quem}${img.licenca ? ` (${img.licenca})` : ""}`;
}

/**
 * Busca em todos os bancos disponíveis (os sem chave são pulados, não quebram),
 * descarta licenças que não permitem uso, remove duplicatas.
 * Devolve { imagens, avisos }.
 */
export async function buscar(q, { n = 8, bancos = Object.keys(BANCOS) } = {}) {
  const avisos = [];
  const lotes = await Promise.allSettled(
    bancos.map(async (nome) => {
      const fn = BANCOS[nome];
      if (!fn) throw new Error(`banco desconhecido: ${nome}`);
      return (await fn(q, n)).map((x) => ({ ...x, banco: nome }));
    })
  );
  const vistos = new Set();
  const imagens = [];
  lotes.forEach((r, i) => {
    if (r.status === "rejected") {
      avisos.push(`${bancos[i]}: ${r.reason?.message || r.reason}`);
      return;
    }
    for (const img of r.value) {
      if (!img.url || !img.licenca) continue; // sem licença clara, fora
      if (vistos.has(img.url)) continue;
      vistos.add(img.url);
      imagens.push({ ...img, credito: credito(img) });
    }
  });
  return { imagens, avisos };
}

/** Baixa a imagem para `arquivo` (e avisa a Unsplash, como a API dela exige). */
export async function baixar(img, arquivo) {
  const { writeFile } = await import("node:fs/promises");
  const r = await fetch(img.url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`download ${r.status}: ${img.url}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  await writeFile(arquivo, bytes);
  if (img.downloadPing && process.env.UNSPLASH_ACCESS_KEY) {
    fetch(img.downloadPing, {
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
    }).catch(() => {});
  }
  return bytes;
}

/**
 * Recorta em círculo com anel colorido e sombra, fundo transparente (PNG).
 * `entrada` pode ser caminho ou Buffer. Devolve Buffer; grava se `saida`.
 */
export async function circulo(
  entrada,
  { diametro = 220, anel = 8, cor = "#06a14e", focoY = 0.22, saida } = {}
) {
  const sharp = (await import("sharp")).default;
  const M = 14; // margem para a sombra
  const T = diametro + 2 * M;
  const meta = await sharp(entrada).metadata();
  const lado = Math.min(meta.width, meta.height);
  const top = Math.max(0, Math.round((meta.height - lado) * focoY));
  const left = Math.round((meta.width - lado) / 2);
  const interno = diametro - 2 * anel;
  const r = interno / 2;
  const foto = await sharp(entrada)
    .extract({ left, top, width: lado, height: lado })
    .resize(interno, interno)
    .png()
    .toBuffer();
  const mascara = Buffer.from(
    `<svg width="${interno}" height="${interno}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`
  );
  const redonda = await sharp(foto)
    .composite([{ input: mascara, blend: "dest-in" }])
    .png()
    .toBuffer();
  const fundo = Buffer.from(`<svg width="${T}" height="${T}">
  <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.45"/></filter></defs>
  <circle cx="${T / 2}" cy="${T / 2}" r="${diametro / 2}" fill="${cor}" filter="url(#s)"/>
</svg>`);
  const out = sharp(fundo)
    .composite([{ input: redonda, top: M + anel, left: M + anel }])
    .png();
  if (saida) {
    await out.toFile(saida);
    return null;
  }
  return out.toBuffer();
}
