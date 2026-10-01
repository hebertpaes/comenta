#!/usr/bin/env node
// =============================================================
// camara-cuiaba.mjs — o que há de novo sobre a Câmara Municipal de Cuiabá.
//
// O site oficial (camaracuiaba.mt.gov.br) responde "Request Rejected" (WAF)
// a esta máquina; não se tenta contornar. As fontes lidas aqui são:
//   1) o canal oficial no YouTube (RSS): sessões, reuniões e eventos;
//   2) o Google Notícias (RSS) para "Câmara Municipal de Cuiabá" nas últimas 48 h;
//   3) uma tentativa simples no site oficial, só para registrar se voltou a abrir.
//
//   node camara-cuiaba.mjs            novos desde pautas/camara-cuiaba/monitor.json
//   node camara-cuiaba.mjs --marcar   grava os novos como vistos
//   node camara-cuiaba.mjs --todas    lista tudo, visto ou não
//
// Rodar com NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt.
// =============================================================
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const MONITOR = new URL("./pautas/camara-cuiaba/monitor.json", import.meta.url).pathname;
const YT = "https://www.youtube.com/feeds/videos.xml?channel_id=UCNCoIaMma_H-aFP6rRNb56w";
const GN = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
const CONSULTAS = ['"Câmara Municipal de Cuiabá" when:2d', '"Câmara de Cuiabá" vereadores when:2d', 'Câmara Cuiabá "Mesa Diretora" when:3d'];
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const ent = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").trim();
const pega = async (url) => { const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (HOJE MT monitor)" } }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); };

let mon = { vistos: {} };
try { mon = JSON.parse(await readFile(MONITOR, "utf8")); mon.vistos ||= {}; } catch {}

const itens = [];
try {
  const x = await pega(YT);
  for (const e of x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = (e[1].match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1];
    itens.push({ id: "yt:" + id, fonte: "YouTube da Câmara", data: (e[1].match(/<published>(.*?)<\/published>/) || [])[1], titulo: ent((e[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ""), url: `https://www.youtube.com/watch?v=${id}` });
  }
} catch (e) { console.log("(YouTube indisponível: " + e.message + ")"); }
for (const q of CONSULTAS) {
  try {
    const x = await pega(GN(q));
    for (const it of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const titulo = ent((it[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
      const url = ent((it[1].match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "");
      const data = new Date((it[1].match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || 0).toISOString();
      const id = "gn:" + titulo.toLowerCase().replace(/\s+-\s+[^-]+$/, "").slice(0, 90);
      if (!itens.some((i) => i.id === id)) itens.push({ id, fonte: "Google Notícias", data, titulo, url });
    }
  } catch (e) { console.log("(Google Notícias indisponível: " + e.message + ")"); }
}
try {
  const h = await pega("https://www.camaracuiaba.mt.gov.br/");
  console.log(/Request Rejected/i.test(h) ? "site oficial: bloqueado pelo WAF (Request Rejected) — não contornar; usar YouTube e imprensa" : `site oficial: abriu (${h.length} bytes) — vale ler as notícias em ${"https://www.camaracuiaba.mt.gov.br/"}`);
} catch (e) { console.log("site oficial: " + e.message); }

itens.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
const novos = args.todas ? itens : itens.filter((i) => !mon.vistos[i.id]);
console.log(`${itens.length} itens · ${novos.length} ${args.todas ? "listados" : "novos"}`);
for (const i of novos) console.log(`- [${i.fonte}] ${(i.data || "").slice(0, 16)} · ${i.titulo}\n  ${i.url}`);
if (args.marcar) {
  for (const i of itens) mon.vistos[i.id] = { titulo: i.titulo, data: i.data };
  mon.ultima_checagem = new Date().toISOString();
  await mkdir(dirname(MONITOR), { recursive: true });
  await writeFile(MONITOR, JSON.stringify(mon, null, 1) + "\n");
  console.log(`monitor.json: ${Object.keys(mon.vistos).length} vistos`);
}
