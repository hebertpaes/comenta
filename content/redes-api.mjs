#!/usr/bin/env node
// =============================================================
// redes-api.mjs — mede as redes oficiais dos candidatos pelas APIs oficiais
// (Meta, YouTube e X) e grava paginas/radar-redes-api.json para o Radar.
// =============================================================
//
//   node redes-api.mjs                  mede tudo o que tiver chave
//   node redes-api.mjs --so=instagram   só um provedor (instagram|anuncios|youtube|x)
//   node redes-api.mjs --seco           mostra o que faria, sem chamar APIs
//
// Os perfis vêm de paginas/radar-dados.json (campo "redes": perfis declarados
// ao TSE). Cada provedor roda só se a chave dele existir; sem chave, fica
// marcado "sem_chave" e o Radar mostra o aviso. Nenhuma chave é gravada.
//
// Env (configuradas no ambiente, nunca no repositório):
//   META_ACCESS_TOKEN   token do app da Meta ligado ao @hoje.mt, com
//                       instagram_basic + pages_show_list + pages_read_engagement
//                       (Instagram Business Discovery). Se a identidade estiver
//                       confirmada na Biblioteca de Anúncios, o mesmo token lê
//                       /ads_archive (anúncios políticos no Brasil).
//   META_IG_USER_ID     id da conta profissional do @hoje.mt (padrão 17841460614185827)
//   META_ADLIB_TOKEN    opcional: token só para a Biblioteca de Anúncios
//   YOUTUBE_API_KEY     chave da YouTube Data API v3 (Google Cloud)
//   X_BEARER_TOKEN      bearer token da API do X (leitura exige plano pago)
//
// Anúncios do Google: o Google parou de veicular anúncios políticos no Brasil
// em maio de 2024 (o relatório público de transparência termina em 28/04/2024),
// por isso não há provedor Google Ads aqui.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DADOS = join(AQUI, "paginas", "radar-dados.json");
const SAIDA = join(AQUI, "paginas", "radar-redes-api.json");
const args = process.argv.slice(2);
const so = (args.find((a) => a.startsWith("--so=")) || "").slice(5);
const seco = args.includes("--seco");
const V = process.env.META_API_VERSION || "v21.0";
const DIA = 864e5;
const agora = Date.now();
const desde7 = agora - 7 * DIA;

const CARGO = {
  governador: ["Doutora Natasha", "Maurício Coelho", "Otaviano Pivetta", "Rafaell Milas", "Sargento Laudicério", "Wellington Fagundes"],
  senador: ["Beny Godoy", "Coronel Darwin", "Fávaro", "Galvan", "Janaina Riva", "Margareth Buzetti", "Mauro Mendes", "Pedro Taques", "Professor Nelson Ferreira", "Zé Medeiros"],
};
// Nome completo para a busca na Biblioteca de Anúncios (a propaganda eleitoral
// é assinada com o nome civil do candidato ou da campanha).
const NOME_CIVIL = {
  "Doutora Natasha": "Natasha Slhessarenko", "Maurício Coelho": "Maurício Coelho", "Otaviano Pivetta": "Otaviano Pivetta",
  "Rafaell Milas": "Rafaell Milas", "Sargento Laudicério": "Laudicério", "Wellington Fagundes": "Wellington Fagundes",
  "Beny Godoy": "Beny Godoy", "Coronel Darwin": "Darwin", "Fávaro": "Carlos Fávaro", "Galvan": "Antônio Galvan",
  "Janaina Riva": "Janaina Riva", "Margareth Buzetti": "Margareth Buzetti", "Mauro Mendes": "Mauro Mendes",
  "Pedro Taques": "Pedro Taques", "Professor Nelson Ferreira": "Nelson Ferreira", "Zé Medeiros": "José Medeiros",
};

// Perfil verificado que o candidato usa de fato, quando difere do @ que consta no
// registro do TSE (conferido pela redação no app). O @ do TSE fica guardado em
// handles.instagram_tse.
const IG_VERIFICADO = {
  "Zé Medeiros": "zemedeiros.222", // TSE lista @senadorzemedeiros222; conferido em 25/09/2026 21h05 (MT)
};

/** Extrai o @ de cada rede a partir das URLs declaradas ao TSE. */
export function handles(redes = []) {
  const h = {};
  for (const [rede, url] of redes) {
    const u = String(url);
    let m;
    if (rede === "Instagram" && (m = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(u))) h.instagram = m[1].toLowerCase();
    if (rede === "YouTube" && (m = /youtube\.com\/(@[A-Za-z0-9._-]+)/i.exec(u))) h.youtube = m[1];
    if (rede === "X" && (m = /(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i.exec(u))) h.x = m[1];
  }
  return h;
}

/** Resume uma lista de publicações: quantas nos últimos 7 dias, interações, média e a melhor. */
export function resumo(posts, seguidores, campos = { data: "timestamp", curtidas: "like_count", comentarios: "comments_count" }) {
  const recentes = posts.filter((p) => Date.parse(p[campos.data]) >= desde7);
  const soma = (p) => (Number(p[campos.curtidas]) || 0) + (Number(p[campos.comentarios]) || 0) + (Number(p.compartilhamentos) || 0);
  const inter = recentes.reduce((t, p) => t + soma(p), 0);
  const melhor = recentes.slice().sort((a, b) => soma(b) - soma(a))[0];
  const media = recentes.length ? Math.round(inter / recentes.length) : 0;
  return {
    posts_7d: recentes.length,
    interacoes_7d: inter,
    media_por_post_7d: media,
    engajamento_pct: seguidores ? Math.round((media / seguidores) * 10000) / 100 : null,
    melhor_7d: melhor ? { link: melhor.permalink || melhor.link || null, interacoes: soma(melhor), data: melhor[campos.data] } : null,
  };
}

async function pega(url, headers = {}) {
  const r = await fetch(url, { headers });
  const t = await r.text();
  let j;
  try { j = JSON.parse(t); } catch { j = { erro_texto: t.slice(0, 200) }; }
  if (!r.ok || j.error || j.errors) {
    const msg = j.error?.message || j.errors?.[0]?.message || j.title || j.detail || j.erro_texto || `HTTP ${r.status}`;
    throw new Error(`${r.status}: ${msg}`);
  }
  return j;
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Instagram (Meta Business Discovery) ----------
async function instagram(h) {
  const tok = process.env.META_ACCESS_TOKEN, ig = process.env.META_IG_USER_ID || "17841460614185827";
  const campos = "username,name,followers_count,follows_count,media_count,media.limit(30){timestamp,like_count,comments_count,media_product_type,permalink}";
  const u = `https://graph.facebook.com/${V}/${ig}?fields=business_discovery.username(${encodeURIComponent(h)}){${campos}}&access_token=${encodeURIComponent(tok)}`;
  const j = (await pega(u)).business_discovery;
  return { perfil: `https://www.instagram.com/${j.username}/`, seguidores: j.followers_count, publicacoes: j.media_count, ...resumo(j.media?.data || [], j.followers_count) };
}

// ---------- Biblioteca de Anúncios da Meta (anúncios políticos no Brasil) ----------
async function anuncios(nome) {
  const tok = process.env.META_ADLIB_TOKEN || process.env.META_ACCESS_TOKEN;
  const civil = NOME_CIVIL[nome] || nome;
  const campos = "page_id,page_name,bylines,spend,impressions,currency,ad_delivery_start_time";
  let url = `https://graph.facebook.com/${V}/ads_archive?ad_type=POLITICAL_AND_ISSUE_ADS&ad_active_status=ALL&ad_reached_countries=${encodeURIComponent('["BR"]')}` +
    `&ad_delivery_date_min=2026-08-16&search_type=KEYWORD_EXACT_PHRASE&search_terms=${encodeURIComponent(civil)}&fields=${campos}&limit=250&access_token=${encodeURIComponent(tok)}`;
  const chave = civil.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  let n = 0, min = 0, max = 0, impMin = 0, impMax = 0; const paginas = new Set();
  for (let pag = 0; url && pag < 8; pag++) {
    const j = await pega(url);
    for (const a of j.data || []) {
      // só anúncios pagos pela campanha do próprio candidato (assinatura ou página com o nome dele)
      const assinatura = `${a.bylines || ""} ${a.page_name || ""}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      if (!assinatura.includes(chave)) continue;
      n++; paginas.add(a.page_name);
      min += Number(a.spend?.lower_bound) || 0; max += Number(a.spend?.upper_bound) || 0;
      impMin += Number(a.impressions?.lower_bound) || 0; impMax += Number(a.impressions?.upper_bound) || 0;
    }
    url = j.paging?.next || null;
  }
  return { anuncios_desde_16_08: n, gasto_min: min, gasto_max: max, impressoes_min: impMin, impressoes_max: impMax, paginas: [...paginas].slice(0, 5), moeda: "BRL" };
}

// ---------- YouTube Data API v3 ----------
async function youtube(h) {
  const key = process.env.YOUTUBE_API_KEY;
  const c = (await pega(`https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&forHandle=${encodeURIComponent(h)}&key=${key}`)).items?.[0];
  if (!c) throw new Error("canal não encontrado");
  const up = c.contentDetails.relatedPlaylists.uploads;
  const itens = (await pega(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=15&playlistId=${up}&key=${key}`)).items || [];
  const ids = itens.map((i) => i.contentDetails.videoId).join(",");
  const vids = ids ? (await pega(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${key}`)).items || [] : [];
  const posts = vids.map((v) => ({ data: v.snippet.publishedAt, curtidas: v.statistics.likeCount, comentarios: v.statistics.commentCount, link: `https://www.youtube.com/watch?v=${v.id}`, views: Number(v.statistics.viewCount) || 0 }));
  const inscritos = c.statistics.hiddenSubscriberCount ? null : Number(c.statistics.subscriberCount);
  const r = resumo(posts, inscritos, { data: "data", curtidas: "curtidas", comentarios: "comentarios" });
  return { perfil: `https://www.youtube.com/${h}`, inscritos, visualizacoes_total: Number(c.statistics.viewCount), videos: Number(c.statistics.videoCount),
    visualizacoes_7d: posts.filter((p) => Date.parse(p.data) >= desde7).reduce((t, p) => t + p.views, 0), ...r };
}

// ---------- X (API v2; leitura exige plano pago) ----------
async function xLote(lista) {
  const tok = process.env.X_BEARER_TOKEN, H = { Authorization: `Bearer ${tok}` };
  const j = await pega(`https://api.x.com/2/users/by?usernames=${lista.map((l) => l.h).join(",")}&user.fields=public_metrics`, H);
  const out = {};
  for (const u of j.data || []) {
    const dono = lista.find((l) => l.h.toLowerCase() === u.username.toLowerCase());
    let r = {};
    try {
      const t = await pega(`https://api.x.com/2/users/${u.id}/tweets?max_results=20&exclude=retweets,replies&tweet.fields=created_at,public_metrics`, H);
      const posts = (t.data || []).map((p) => ({ data: p.created_at, curtidas: p.public_metrics.like_count, comentarios: p.public_metrics.reply_count, compartilhamentos: p.public_metrics.retweet_count + p.public_metrics.quote_count, link: `https://x.com/${u.username}/status/${p.id}` }));
      r = resumo(posts, u.public_metrics.followers_count, { data: "data", curtidas: "curtidas", comentarios: "comentarios" });
    } catch (e) { r = { erro_posts: String(e.message).slice(0, 120) }; }
    if (dono) out[dono.nome] = { perfil: `https://x.com/${u.username}`, seguidores: u.public_metrics.followers_count, posts_total: u.public_metrics.tweet_count, ...r };
  }
  return out;
}

// ---------- execução (só quando chamado direto; importar não coleta nada) ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

async function main() {
const dados = JSON.parse(readFileSync(DADOS, "utf8"));
const PROV = {
  instagram: !!process.env.META_ACCESS_TOKEN,
  anuncios: !!(process.env.META_ADLIB_TOKEN || process.env.META_ACCESS_TOKEN),
  youtube: !!process.env.YOUTUBE_API_KEY,
  x: !!process.env.X_BEARER_TOKEN,
};
const saida = { coletado_em: new Date(agora).toISOString(), provedores: {}, candidatos: {} };
for (const [p, tem] of Object.entries(PROV)) saida.provedores[p] = { status: so && so !== p ? "pulado" : tem ? "ok" : "sem_chave", erros: 0 };
const todos = [...CARGO.governador.map((n) => [n, "governador"]), ...CARGO.senador.map((n) => [n, "senador"])];
const listaX = [];
for (const [nome, cargo] of todos) {
  const h = handles((dados.redes || {})[nome]);
  if (IG_VERIFICADO[nome] && IG_VERIFICADO[nome] !== h.instagram) { h.instagram_tse = h.instagram || null; h.instagram = IG_VERIFICADO[nome]; }
  const c = (saida.candidatos[nome] = { cargo, handles: h });
  const roda = async (p, fn) => {
    if (saida.provedores[p].status !== "ok") return;
    if (seco) { c[p] = { seco: true }; return; }
    try { c[p] = await fn(); } catch (e) { c[p] = { erro: String(e.message).slice(0, 160) }; saida.provedores[p].erros++; }
    await espera(400);
  };
  if (h.instagram) await roda("instagram", () => instagram(h.instagram));
  await roda("anuncios", () => anuncios(nome));
  if (h.youtube) await roda("youtube", () => youtube(h.youtube));
  if (h.x) listaX.push({ nome, h: h.x });
}
if (saida.provedores.x.status === "ok" && listaX.length && !seco) {
  try { const r = await xLote(listaX); for (const [n, v] of Object.entries(r)) saida.candidatos[n].x = v; }
  catch (e) { saida.provedores.x.status = "erro"; saida.provedores.x.msg = String(e.message).slice(0, 160); }
}
for (const p of Object.values(saida.provedores)) if (p.status === "ok" && p.erros && p.erros === todos.length) p.status = "erro";
if (!seco) writeFileSync(SAIDA, JSON.stringify(saida, null, 1) + "\n");
console.log(Object.entries(saida.provedores).map(([k, v]) => `${k}: ${v.status}${v.erros ? ` (${v.erros} erros)` : ""}`).join(" · "));
console.log(seco ? "seco: nada gravado" : `gravado em ${SAIDA}`);
}
