#!/usr/bin/env node
// =============================================================
// camara-vg.mjs — lista o que há de novo no site da Câmara Municipal de
// Várzea Grande (varzeagrande.mt.leg.br, Plone/Interlegis) desde o último
// visto, com o texto das notícias novas.
//
//   node camara-vg.mjs                 novas desde pautas/camara-varzea-grande/monitor.json
//   node camara-vg.mjs --todas         as 30 últimas, vistas ou não
//   node camara-vg.mjs --marcar        grava as novas como vistas no monitor.json
//   node camara-vg.mjs --texto=<slug>  imprime o texto de uma notícia
//
// Rodar com NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt.
// Só lê páginas públicas; não grava nada além do monitor.json (com --marcar).
// =============================================================
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const BASE = "https://www.varzeagrande.mt.leg.br";
const RSS = `${BASE}/institucional/noticias/agregador/RSS`;
const MONITOR = new URL("./pautas/camara-varzea-grande/monitor.json", import.meta.url).pathname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

const ent = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ");
const limpa = (h) => ent(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<\/(p|h\d|li|div)>/g, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
async function pega(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (HOJE MT monitor)" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}
async function texto(url) {
  const h = await pega(url);
  const m = h.match(/id="content"[\s\S]*?(?=id="afooter"|<footer)/);
  return limpa(m ? m[0] : h).slice(0, 6000);
}

if (args.texto) { console.log(await texto(`${BASE}/institucional/noticias/${args.texto}`)); process.exit(0); }

const xml = await pega(RSS);
const itens = [...xml.matchAll(/<item rdf:about="([^"]+)">([\s\S]*?)<\/item>/g)].map((m) => ({
  url: m[1],
  titulo: ent((m[2].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").trim(),
  data: ((m[2].match(/<dc:date>([\s\S]*?)<\/dc:date>/) || [])[1] || "").trim(),
  resumo: ent((m[2].match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "").trim(),
}));
let mon = { vistos: {} };
try { mon = JSON.parse(await readFile(MONITOR, "utf8")); mon.vistos ||= {}; } catch {}
const novos = args.todas ? itens : itens.filter((i) => !mon.vistos[i.url]);
console.log(`${itens.length} no RSS · ${novos.length} ${args.todas ? "listadas" : "novas"}`);
for (const i of novos) {
  console.log(`\n### ${i.data} · ${i.titulo}\n${i.url}\n${i.resumo}`);
  if (!args.todas) { try { console.log("---\n" + (await texto(i.url)).slice(0, 3500)); } catch (e) { console.log("(texto indisponível: " + e.message + ")"); } }
}
if (args.marcar) {
  for (const i of itens) mon.vistos[i.url] = { titulo: i.titulo, data: i.data };
  mon.ultima_checagem = new Date().toISOString();
  await mkdir(dirname(MONITOR), { recursive: true });
  await writeFile(MONITOR, JSON.stringify(mon, null, 1) + "\n");
  console.log(`\nmonitor.json: ${Object.keys(mon.vistos).length} vistos`);
}
