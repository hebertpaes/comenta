#!/usr/bin/env node
// =============================================================
// camaras-mt.mjs — o que há de novo nas Câmaras Municipais de Sorriso e de
// Lucas do Rio Verde (sem RSS: lê a lista de notícias do site e o RSS do
// canal oficial no YouTube). Para Várzea Grande use camara-vg.mjs; para
// Cuiabá, camara-cuiaba.mjs.
//
//   node camaras-mt.mjs                       novos desde pautas/camaras-mt/monitor.json
//   node camaras-mt.mjs --camara=sorriso      só uma (sorriso | lrv | chapada)
//   node camaras-mt.mjs --textos              inclui o começo do texto das notícias novas
//   node camaras-mt.mjs --marcar              grava os novos como vistos
//   node camaras-mt.mjs --texto=<url>         imprime o texto de uma notícia
//
// Rodar com NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt.
// =============================================================
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const MONITOR = new URL("./pautas/camaras-mt/monitor.json", import.meta.url).pathname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const ent = (s) => s.replace(/&ccedil;/g, "ç").replace(/&atilde;/g, "ã").replace(/&otilde;/g, "õ").replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í").replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&acirc;/g, "â").replace(/&ecirc;/g, "ê").replace(/&ocirc;/g, "ô").replace(/&agrave;/g, "à").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/&ordf;/g, "ª").replace(/&ordm;/g, "º").replace(/&([AEIOU])acute;/g, (_, v) => ({ A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú" })[v]).replace(/&Ccedil;/g, "Ç").replace(/&Atilde;/g, "Ã").replace(/&Otilde;/g, "Õ").replace(/&ndash;|&mdash;/g, "–").replace(/&[lr]dquo;/g, '"').replace(/&[lr]squo;/g, "'").replace(/&hellip;/g, "…").replace(/&bull;/g, "•").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const limpa = (h) => ent(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<\/(p|h\d|li|div|tr)>/g, "\n").replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const pega = async (url) => { const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (HOJE MT monitor)", "accept-language": "pt-BR" }, redirect: "follow" }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); };
const absoluta = (base, u) => new URL(u, base).toString();

const CAMARAS = {
  chapada: {
    nome: "Câmara de Chapada dos Guimarães", youtube: ["UCuvSvovy7SDpHHLScxxSjhw", "UCFkqY6WaArTS7R-31O6MdsA"],
    lista: null, // o site (camarachapadadosguimaraes.mt.gov.br) pede verificação anti-robô e derruba a conexão deste ambiente; não contornar
    gnews: ['"Câmara de Chapada dos Guimarães" when:3d', 'Chapada dos Guimarães vereadores Câmara Municipal when:3d'],
    extras: ["Site oficial: https://www.camarachapadadosguimaraes.mt.gov.br (bloqueio anti-robô: não contornar; se um dia abrir, ler Imprensa/Noticias)", "SAPL (matérias, sessões e pautas; hoje praticamente vazio): https://sapl.chapadadosguimaraes.mt.leg.br", "YouTube: @camaramunicipalchapada e @CamaraMunicipaldeChapada (TV Câmara)", "Sessão ordinária de 30/09 adiada para 06/10 (Ato Legislativo nº 021/2026), segundo o Alô Chapada"],
  },
  sorriso: {
    nome: "Câmara de Sorriso", youtube: "UCxB83MjthQzTscHkE4vX1mA",
    lista: "https://sorriso.mt.leg.br/noticias",
    extrair(h, base) {
      const out = [];
      for (const li of h.matchAll(/<a href="(https:\/\/sorriso\.mt\.leg\.br\/noticia\/[^"]+)"[\s\S]*?<\/a>/g)) {
        const bloco = li[0];
        const d = (bloco.match(/>\s*(\d{2})\.(\d{2})\.(\d{4})\s*</) || []);
        const titulo = ent((bloco.match(/<h3[^>]*title="([^"]+)"/) || [])[1] || "");
        const cat = ent(((bloco.match(/<span[^>]*>\s*([^<]{2,40}?)\s*<\/span>/) || [])[1]) || "");
        if (titulo) out.push({ url: li[1], data: d[3] ? `${d[3]}-${d[2]}-${d[1]}` : "", categoria: cat, titulo });
      }
      return out;
    },
    extras: ["Sessões e pautas: https://sorriso.siscam.com.br/sessoes", "Eventos: https://sorriso.mt.leg.br/agenda", "Transparência: https://transparenciaprefeiturasorriso.agilicloud.com.br/camsorriso"],
  },
  lrv: {
    nome: "Câmara de Lucas do Rio Verde", youtube: "UCAnCP9FRRZybkqSm2XzoPmQ",
    lista: "https://www.camaralucasdorioverde.mt.gov.br/Noticias/",
    extrair(h, base) {
      const out = [];
      for (const a of h.matchAll(/<article[\s\S]*?<\/article>/g)) {
        const b = a[0];
        const href = (b.match(/href="(Noticias\/[^"]+)"/) || [])[1];
        const data = (b.match(/<time datetime="([\d-]+)"/) || [])[1] || "";
        const titulo = ent((b.match(/<img[^>]*alt="([^"]+)"/) || b.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/) || [])[1] || "").replace(/<[^>]+>/g, "").trim();
        if (href && titulo) out.push({ url: absoluta("https://www.camaralucasdorioverde.mt.gov.br/", href), data, categoria: "", titulo });
      }
      return out;
    },
    extras: ["Pautas das sessões: https://www.camaralucasdorioverde.mt.gov.br/Publicacoes/Pautas-das-sessoes-22/", "Atas: https://www.camaralucasdorioverde.mt.gov.br/Publicacoes/Atas-das-sessoes-23/", "Calendário das sessões: https://www.camaralucasdorioverde.mt.gov.br/Publicacoes/Calendario-das-Sessoes-Online/", "Proposituras (projetos de lei etc.): https://www.camaralucasdorioverde.mt.gov.br/Proposituras/Projeto-de-lei-16/", "Vídeos: https://www.camaralucasdorioverde.mt.gov.br/Imprensa/Galeria-de-Videos/"],
  },
};

async function texto(url) {
  const h = await pega(url);
  const inicios = [/<h4[^>]*>\s*Not[ií]cia\s*<\/h4>/i, /id="imprimir_noti"/i, /<h1/i];
  let i = -1; for (const re of inicios) { const m = h.search(re); if (m >= 0) { i = m; break; } }
  const corpo = i >= 0 ? h.slice(h.lastIndexOf('<', i)) : h;
  const f = corpo.search(/id="social-footer"|<footer|id="afooter"|Not[ií]cias relacionadas|Outras not[ií]cias|class="rodape/i);
  return limpa(f > 0 ? corpo.slice(0, f) : corpo).slice(0, 5000);
}
if (args.texto) { console.log(await texto(String(args.texto))); process.exit(0); }

let mon = { vistos: {} };
try { mon = JSON.parse(await readFile(MONITOR, "utf8")); mon.vistos ||= {}; } catch {}
const quais = args.camara ? [String(args.camara)] : Object.keys(CAMARAS);
const todos = [];
for (const k of quais) {
  const c = CAMARAS[k]; if (!c) { console.log("câmara desconhecida: " + k); continue; }
  if (c.lista) { try { for (const i of c.extrair(await pega(c.lista), c.lista)) todos.push({ ...i, camara: k, fonte: c.nome, id: `${k}:${i.url}` }); } catch (e) { console.log(`(${c.nome}: site indisponível — ${e.message})`); } }
  for (const yt of [].concat(c.youtube)) {
    try {
      const x = await pega(`https://www.youtube.com/feeds/videos.xml?channel_id=${yt}`);
      for (const e of x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
        const id = (e[1].match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1];
        if (todos.some((t) => t.id === `${k}:yt:${id}`)) continue;
        todos.push({ camara: k, fonte: c.nome + " (YouTube)", id: `${k}:yt:${id}`, url: `https://www.youtube.com/watch?v=${id}`, data: ((e[1].match(/<published>(.*?)<\/published>/) || [])[1] || "").slice(0, 10), categoria: "vídeo", titulo: ent((e[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "") });
      }
    } catch (e) { console.log(`(${c.nome}: YouTube indisponível — ${e.message})`); }
  }
  for (const q of c.gnews || []) {
    try {
      const x = await pega(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`);
      for (const it of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const titulo = ent((it[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
        const url = ent((it[1].match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "");
        const data = new Date((it[1].match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || 0).toISOString().slice(0, 10);
        const id = `${k}:gn:` + titulo.toLowerCase().replace(/\s+-\s+[^-]+$/, "").slice(0, 90);
        if (!todos.some((t) => t.id === id)) todos.push({ camara: k, fonte: c.nome + " (imprensa)", id, url, data, categoria: "imprensa", titulo });
      }
    } catch (e) { console.log(`(${c.nome}: Google Notícias indisponível — ${e.message})`); }
  }
}
todos.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
const novos = args.todas ? todos : todos.filter((i) => !mon.vistos[i.id]);
console.log(`${todos.length} itens · ${novos.length} ${args.todas ? "listados" : "novos"}`);
for (const k of quais) if (CAMARAS[k]) console.log(`\n[${CAMARAS[k].nome}] outras páginas: ${CAMARAS[k].extras.join(" · ")}`);
for (const i of novos) {
  console.log(`\n- [${i.fonte}] ${i.data} ${i.categoria ? "(" + i.categoria + ") " : ""}${i.titulo}\n  ${i.url}`);
  if (args.textos && !i.id.includes(":yt:")) { try { console.log("  ---\n" + (await texto(i.url)).slice(0, 1800).replace(/^/gm, "  ")); } catch (e) { console.log("  (texto indisponível: " + e.message + ")"); } }
}
if (args.marcar) {
  for (const i of todos) mon.vistos[i.id] = { titulo: i.titulo, data: i.data };
  mon.ultima_checagem = new Date().toISOString();
  await mkdir(dirname(MONITOR), { recursive: true });
  await writeFile(MONITOR, JSON.stringify(mon, null, 1) + "\n");
  console.log(`\nmonitor.json: ${Object.keys(mon.vistos).length} vistos`);
}
