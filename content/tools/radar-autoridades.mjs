#!/usr/bin/env node
// =============================================================
// radar-autoridades.mjs — manchetes das autoridades extras do Radar Eleitoral
// (pedido do editor em 08/10/2026: "Das autoridades que participaram inclua também
// as outras: como o prefeito de Rondonópolis e de Sinop").
//
// A lista principal do radar (/content/media/apuracao/radar-candidatos.json) é gerada
// no servidor, fora deste repositório. Este script cobre os nomes de
// content/paginas/radar-autoridades.json: busca no Google Notícias as manchetes dos
// últimos 7 dias que citam a pessoa, classifica por palavras (polêmica, proposta ou
// rotina, como avisa a página) e grava em radar-dados.json → "autoridades". O card do
// radar junta esses nomes aos do servidor; se o servidor passar a trazer o mesmo nome,
// vale o do servidor.
//
//   node content/tools/radar-autoridades.mjs            # coleta e grava
//   node content/tools/radar-autoridades.mjs --seco     # só mostra o resultado
// Depois: python3 content/paginas/radar-build.py e
//   node content/pagina-ghost.mjs --slug=radar-eleitoral --arquivo=paginas/radar-eleitoral.html
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = new URL("../paginas/", import.meta.url);
const CFG = JSON.parse(readFileSync(new URL("radar-autoridades.json", RAIZ), "utf8"));
const P_DADOS = new URL("radar-dados.json", RAIZ);
const SECO = process.argv.includes("--seco");
const JANELA_DIAS = 7;

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tem = (t, l) => l.some((w) => t.includes(w));

// Palavras de polêmica e de proposta (sem acento, minúsculas). A polêmica vence quando há as duas.
const POL = ["operacao", " pf ", "policia federal", "investiga", "denuncia", "acusa", "suspeit", "irregular", "improbidade",
  "ministerio publico", "mpmt", "mpe ", "promotor", "acao civil", "multa", "cassa", "afastad", "preso", "prisao", "condena",
  " reu ", "alvo", "busca e apreensao", "crise", "polemica", "critica", "rebate", "ataca", "briga", "bate-boca", "protesto",
  "reclama", "cobra ", "falta de", "caos", "atraso", "rombo", "calote", "greve", "nega ", "contesta", "questiona", "repudi",
  "derrota", "racha", "rompe", "processo", "liminar", "tce ", "tribunal de contas", "justica eleitoral", "propaganda irregular"];
const PROP = ["anuncia", "inaugura", "entrega", "lanca", "investe", "investimento", "assina", "garante", "amplia", "reforma",
  "obra", "pavimenta", "asfalto", "programa", "projeto", "convenio", "parceria", "inicia", "conclui", "implanta", "cria ",
  "mutirao", "vacina", "capacita", "regulariza", "recursos", "milhoes", "moderniza", "revitaliza", "construcao", "constroi",
  "beneficia", "melhoria", "habitacional", "casas", "escola", "creche", "posto de saude", "hospital", "ponte", "drenagem",
  "iluminacao", "plano", "proposta", "defende"];

function classifica(titulo) {
  const t = " " + norm(titulo).replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ") + " ";
  if (tem(t, POL)) return "p";
  if (tem(t, PROP)) return "s";
  return "n";
}

function ddmm(d) {
  const f = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Cuiaba", day: "2-digit", month: "2-digit" });
  return f.format(d);
}

function itensRss(xml) {
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const b = m[1];
    const g = (tag) => { const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(b); return r ? r[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() : ""; };
    const des = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    out.push({ titulo: des(g("title")), link: des(g("link")), data: new Date(g("pubDate")), fonte: des(g("source")) });
  }
  return out;
}

async function busca(termo) {
  const u = "https://news.google.com/rss/search?q=" + encodeURIComponent(termo + " when:7d") + "&hl=pt-BR&gl=BR&ceid=BR:pt-419";
  const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (HOJE MT radar)" } });
  if (!r.ok) throw new Error(`Google Notícias ${r.status} para ${termo}`);
  return itensRss(await r.text());
}

const limite = Date.now() - JANELA_DIAS * 864e5;
const candidatos = [];
for (const a of CFG.autoridades) {
  const chaves = (a.cita || [a.nome]).map(norm);
  const vistos = new Set();
  const pol = [], sol = [];
  let neutras = 0;
  for (const termo of a.termos) {
    let itens = [];
    try { itens = await busca(termo); } catch (e) { console.error("aviso:", e.message); continue; }
    for (const it of itens) {
      if (!(it.data instanceof Date) || isNaN(it.data) || it.data.getTime() < limite) continue;
      // tira o " - Veículo" do fim, como o radar faz
      let t = it.titulo;
      if (it.fonte && t.endsWith(" - " + it.fonte)) t = t.slice(0, -(it.fonte.length + 3));
      const tn = norm(t);
      if (!chaves.some((c) => tn.includes(c))) continue; // só manchete que cita a pessoa
      const k = tn.replace(/[^a-z0-9]/g, "").slice(0, 90);
      if (vistos.has(k)) continue;
      vistos.add(k);
      const x = { titulo: t, fonte: it.fonte || "", url: it.link || "", data: ddmm(it.data), _ts: it.data.getTime() };
      const c = classifica(t);
      if (c === "p") pol.push(x); else if (c === "s") sol.push(x); else neutras++;
    }
  }
  const ord = (l) => l.sort((p, q) => q._ts - p._ts).map(({ _ts, ...r }) => r);
  candidatos.push({ nome: a.nome, cargo: a.cargo || "prefeito", partido: a.partido || "", instagram: "", cidade: a.cidade || "",
    candidato: false, confirmar: false, polemicas: ord(pol), solucoes: ord(sol), neutras, total: pol.length + sol.length + neutras });
  console.log(`${a.nome} (${a.cidade}): ${pol.length} polêmicas, ${sol.length} propostas, ${neutras} de rotina`);
}

const bloco = { gerado_em: new Date().toISOString().replace(/\.\d+Z$/, "Z"), janela_dias: JANELA_DIAS,
  fonte: "Google Notícias (manchetes que citam o nome); classificação automática por palavras", candidatos };
if (SECO) { console.log(JSON.stringify(bloco, null, 1).slice(0, 3000)); process.exit(0); }
// grava pelo Python para preservar o formato do radar-dados.json (indentação de 1 espaço, números como 9.0)
const r = spawnSync("python3", ["-I", "-c", [
  "import json,sys",
  "p=sys.argv[1];d=json.load(open(p,encoding='utf-8'));d['autoridades']=json.loads(sys.stdin.read())",
  "open(p,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=1)+'\\n')"].join("\n"), fileURLToPath(P_DADOS)],
  { input: JSON.stringify(bloco), encoding: "utf8" });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(`radar-dados.json: ${candidatos.length} autoridades gravadas em "autoridades"`);
