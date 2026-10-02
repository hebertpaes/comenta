// Slides (1080×1920) do boletim em vídeo nº 1 (26/09/2026) refeito no formato
// "só voz e slides": sem avatar, sem o nome do avatar, sem música (editor,
// 02/10: "Não cite nome do avatar e nem crie avatar, simplesmente deixe a voz
// aprimorada e com slides profissionais divulgando o nome do site hojemt e
// pedindo para seguir e compartilhar nossas redes sociais Hoje MT").
// Tema: as pesquisas registradas a 8 dias da eleição — governo de MT (5
// pesquisas desde 4/9, 1º e 2º turno), Senado (1º voto) e Presidência (11
// nacionais + Quaest MT).
// Registro histórico: os números são os da época, lidos do Radar como estava
// quando o nº 1 foi feito (commit 4d221f7, pesquisas "atualizado 26/09/2026"),
// nunca do radar-dados.json atual. O script CONFERE cada número e cada
// contagem das falas nesse retrato (throw se não bater), confere a fala com o
// texto publicado do boletim (boletins[0] do Radar atual, só leitura) e
// confere se alguma das pesquisas usadas mudou depois no Radar atual (erro
// descoberto depois); rodadas substituídas por outras mais novas não contam.
// A intro (cena 1) sai do intro-boletim.mjs e o fechamento (última cena) do
// fechamento-boletim.mjs; aqui ficam as cenas 2 a 8 (arquivos <prefixo>-1… a
// <prefixo>-7…, k = cena − 1, como no nº 4 e no nº 5).
// Empate técnico: diferença MENOR que duas vezes a margem de erro (critério
// estrito), aplicado igual a todos os candidatos de todas as disputas; é o
// que reproduz exatamente as classificações do Radar da época (governo:
// Quaest e AtlasIntel no 1º turno, as duas de Wellington no 2º turno;
// Presidência: nove no 2º turno). Senado sem selo: o Radar só diz que a
// vantagem de Janaina sobre o 3º colocado é maior que a margem em todas.
// "Divulgadas", não "registradas", na fala e no slide: já havia em 26/9 uma
// pesquisa Veritá registrada (governo e Senado) e suspensa pelo TRE-MT em
// 16/9, divulgada só em 28/9 e suspensa de novo; o retrato da época não a
// conhecia (o Radar atual diz "registradas ... que estão no Radar").
// Uso: node graficos-boletim-01-slides.mjs
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createRequire } from "node:module";

import { SCRATCH, esc, pct, fundo, fontes, CSS as CSS_BASE } from "./slides-lib.mjs";
const require = createRequire(join(SCRATCH, "pw", "package.json"));
const { chromium } = require("playwright-core");

const GIT = "/home/user/comenta";
const REPO = join(GIT, "content");
const PASTA = "pautas/videos/argos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-09-26-boletim-01";
const SNAP = "4d221f7"; // estado do Radar quando o boletim nº 1 foi feito
const PREVIA = join(SCRATCH, "b1-slides-previa");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

// ------------------------------------------------------------ dados da época
const radar = JSON.parse(execFileSync("git", ["-C", GIT, "show", `${SNAP}:content/paginas/radar-dados.json`], { encoding: "utf8", maxBuffer: 64 << 20 }));
const atual = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8"));
const erros = [];
const confere = (rot, v, esperado) => { if (JSON.stringify(v) !== JSON.stringify(esperado)) erros.push(`${rot}: Radar ${JSON.stringify(v)} × fala/slide ${JSON.stringify(esperado)}`); };
const tem = (rot, texto, trecho) => { if (!String(texto || "").includes(trecho)) erros.push(`${rot}: não contém "${trecho}"`); };

if (radar.pesquisas.atualizado !== "26/09/2026") erros.push(`retrato do Radar com data ${radar.pesquisas.atualizado} (esperado 26/09/2026)`);
const corrida = (id) => radar.pesquisas.corridas.find((c) => c.id === id);
const gov = corrida("governador-mt"), sen = corrida("senado-mt"), pres = corrida("presidente");
if (!gov || !sen || !pres) throw new Error("corrida não encontrada no retrato 4d221f7");
const num = (m) => Number(String(m).replace(",", "."));
const empate = (a, b, margem) => Math.abs(a - b) < 2 * num(margem) - 1e-9;
const regMT = (r) => r.split(/\s*,\s*/).find((x) => x.startsWith("MT-")) || r.split(/\s*,\s*/)[0];
const regBR = (r) => r.split(/\s*,\s*/).find((x) => x.startsWith("BR-")) || r.split(/\s*,\s*/)[0];
const campoCurto = (c) => c.replace(/^0?(\d+) a 0?(\d+)\/0?(\d+)$/, "$1–$2/$3");
const n = (x) => String(x).replace(".", ","); // número sem o %

// texto publicado do boletim nº 1 (referência dos fatos)
const pub = (atual.boletins || [])[0];
if (!pub || pub.n !== 1) throw new Error("boletins[0] (nº 1) não está no Radar atual");
const texto = pub.texto.join(" ");
for (const t of ["cinco pesquisas registradas desde 4/9", "Pivetta aparece à frente em quatro", "na Quaest, a mais recente, é empate técnico (29% a 27%)",
  "Pivetta vence em três pesquisas e Wellington aparece à frente em duas, ambas dentro da margem de erro",
  "Mauro Mendes e Janaina Riva lideram em todas as pesquisas", "Mauro tem 37% no 1º voto e Janaina, 19%",
  "Lula e Flávio Bolsonaro disputam o topo nas 11 pesquisas nacionais, quase sempre em empate técnico",
  "a Quaest mostra Flávio com 50% e Lula com 25%", "Pesquisa é retrato do momento"]) tem("texto publicado do nº 1", texto, t);

// --- governo: as cinco pesquisas registradas desde 4/9
const G = gov.pesquisas;
confere("governo: nº de pesquisas", G.length, 5);
confere("governo: registros", G.map((q) => regMT(q.reg)), ["MT-08098/2026", "MT-00691/2026", "MT-09335/2026", "MT-02766/2026", "MT-01505/2026"]);
tem("governo: porque", gov.porque, "cinco pesquisas registradas desde 4/9");
tem("governo: porque", gov.porque, "Wellington em uma (AtlasIntel, também empate técnico)");
tem("governo: porque", gov.porque, "Pivetta vence em três pesquisas e Wellington aparece à frente em duas, ambas dentro da margem de erro");
const PIV = "Otaviano Pivetta", WEL = "Wellington Fagundes";
const topo2 = (v) => Object.entries(v).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
for (const q of G) if (topo2(q.v).sort().join() !== [PIV, WEL].sort().join()) erros.push(`governo ${q.inst} ${q.campo}: Pivetta e Wellington não são os dois primeiros`);
const frente1 = (nome) => G.filter((q) => q.v[nome] > Math.max(...Object.entries(q.v).filter(([k]) => k !== nome).map(([, x]) => x))).length;
confere("governo 1º turno: Pivetta à frente em", frente1(PIV), 4);
confere("governo 1º turno: Wellington à frente em", frente1(WEL), 1);
const qGov = G.find((q) => q.inst === "Quaest");
confere("governo Quaest Pivetta", qGov.v[PIV], 29);
confere("governo Quaest Wellington", qGov.v[WEL], 27);
confere("governo Quaest Natasha", qGov.v["Doutora Natasha"], 11);
confere("governo Quaest margem", qGov.margem, "3");
confere("governo: a Quaest é a mais recente", G[0].inst, "Quaest");
const emp1 = G.filter((q) => empate(q.v[PIV], q.v[WEL], q.margem)).map((q) => q.inst);
confere("governo 1º turno: empates técnicos", emp1, ["Quaest", "AtlasIntel"]);
// 2º turno simulado (todas as cinco têm Pivetta × Wellington)
const t2 = (q) => { const [a, va, b, vb] = q.t2[0]; return { [a]: va, [b]: vb }; };
const fr2 = (nome) => G.filter((q) => { const s = t2(q); return s[nome] > s[nome === PIV ? WEL : PIV]; });
confere("governo 2º turno: Pivetta à frente em", fr2(PIV).length, 3);
confere("governo 2º turno: Wellington à frente em", fr2(WEL).length, 2);
if (!fr2(WEL).every((q) => empate(t2(q)[PIV], t2(q)[WEL], q.margem))) erros.push("governo 2º turno: as duas de Wellington não estão dentro da margem");
const emp2 = G.filter((q) => empate(t2(q)[PIV], t2(q)[WEL], q.margem)).map((q) => `${q.inst} ${q.campo}`);
// MT Dados: 38 × 32 com margem de 3 = diferença de 6, igual a 2× a margem: fora do selo
confere("governo 2º turno: empates técnicos", emp2, ["Quaest 21 a 24/09", "AtlasIntel 04 a 09/09"]);

// --- Senado: quatro pesquisas desde 6/9, 1º voto
const S = sen.pesquisas;
confere("Senado: nº de pesquisas", S.length, 4);
tem("Senado: porque", sen.porque, "Nas quatro pesquisas registradas desde 6/9, Mauro lidera e Janaina fica em segundo");
const MAU = "Mauro Mendes", JAN = "Janaina Riva", MED = "Zé Medeiros";
const somaDe = (q) => Object.fromEntries([...q.soma.matchAll(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú.]*(?: [A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú.]*)*) (\d+(?:,\d+)?)%/g)].map((m) => [m[1], num(m[2])]));
for (const q of S) {
  const v = q.v || somaDe(q);
  confere(`Senado ${q.inst} ${q.campo}: dois primeiros`, topo2(Object.fromEntries(Object.entries(v).filter(([k]) => !/branco|nulo|indecis|sabe/i.test(k)))), [MAU, JAN]);
}
const qSen = S.find((q) => q.inst === "Quaest");
confere("Senado Quaest Mauro", qSen.v[MAU], 37);
confere("Senado Quaest Janaina", qSen.v[JAN], 19);
confere("Senado Quaest Medeiros", qSen.v[MED], 11);
const sen1 = S.filter((q) => q.v); // as três com 1º voto
const senSoma = S.find((q) => !q.v);
confere("Senado: pesquisa só com a soma", senSoma && `${senSoma.inst} ${senSoma.campo} ${senSoma.reg}`, "Paraná Pesquisas 06 a 08/09 MT-01505/2026");
tem("Senado: porque", sen.porque, "com vantagem sobre o terceiro colocado maior que a margem de erro em todas");

// --- Presidência: 11 nacionais + Quaest MT (nota)
const P = pres.pesquisas;
confere("Presidência: nº de pesquisas nacionais", P.length, 11);
tem("Presidência: porque", pres.porque, "Nas 11 pesquisas nacionais registradas (a rodada mais recente de cada instituto, com campo entre 14 e 23/9)");
tem("Presidência: porque", pres.porque, "No 1º turno, Lula aparece à frente em oito, Flávio em duas, e há um empate");
tem("Presidência: porque", pres.porque, "No 2º turno simulado, Flávio está à frente em seis, Lula em três, e há dois empates; em nove delas a diferença fica dentro da margem de erro");
const LU = "Lula", FL = "Flávio Bolsonaro";
for (const q of P) if (topo2(q.v).sort().join() !== [FL, LU].sort().join()) erros.push(`Presidência ${q.inst}: Lula e Flávio não são os dois primeiros`);
const conta = (pares) => ({ lula: pares.filter(([l, f]) => l > f).length, flavio: pares.filter(([l, f]) => f > l).length, iguais: pares.filter(([l, f]) => l === f).length });
const p1 = P.map((q) => [q.v[LU], q.v[FL], q.margem]);
const p2 = P.map((q) => { const s = t2(q); return [s[LU], s[FL], q.margem]; });
confere("Presidência 1º turno (Lula/Flávio/iguais)", conta(p1), { lula: 8, flavio: 2, iguais: 1 });
confere("Presidência 2º turno (Lula/Flávio/iguais)", conta(p2), { lula: 3, flavio: 6, iguais: 2 });
const emp1P = p1.filter(([l, f, m]) => empate(l, f, m)).length, emp2P = p2.filter(([l, f, m]) => empate(l, f, m)).length;
confere("Presidência 2º turno: empates técnicos (nove, como no Radar)", emp2P, 9);
// 1º turno: Datafolha 40×36, Real Time Big Data 41×37 e Quaest 37×33 (±2) ficam no limite, fora do selo
confere("Presidência 1º turno: empates técnicos", emp1P, 6);
const outros = Math.max(...P.flatMap((q) => Object.entries(q.v).filter(([k]) => ![LU, FL].includes(k)).map(([, x]) => x)));
confere("Presidência: maior votação fora Lula e Flávio", outros, 8);
tem("Presidência: nota", pres.nota, "Em Mato Grosso, a Quaest (21 a 24/9, registros MT-08098/2026 e BR-09594/2026) mostra Flávio com 50% e Lula com 25% no 1º turno; no 2º turno, 56% a 30%.");
const MTP = { [FL]: 50, [LU]: 25 }, MTP2 = { [FL]: 56, [LU]: 30 };

// --- algo da época se revelou errado? (mesma pesquisa, mesmo registro, no Radar atual)
for (const c of radar.pesquisas.corridas) {
  const ca = atual.pesquisas.corridas.find((x) => x.id === c.id);
  for (const q of c.pesquisas) {
    const qa = ca?.pesquisas.find((x) => x.inst === q.inst && x.reg === q.reg);
    if (!qa) continue; // rodada substituída por uma mais nova (não é correção)
    for (const k of ["campo", "amostra", "margem", "v", "t2", "soma"])
      if (JSON.stringify(q[k] ?? null) !== JSON.stringify(qa[k] ?? null)) erros.push(`${c.id} ${q.inst} ${q.reg}: "${k}" mudou no Radar atual (revisar a fala)`);
  }
}
if (erros.length) throw new Error("dados não conferem; ajuste a fala e o slide:\n- " + erros.join("\n- "));

// ------------------------------------------------------------ peças
const CSS = CSS_BASE + `
.sub2{font:600 30px/1.3 Inter;color:#cfe9dd}
.sub2 b{color:#fff;font-weight:800}
.card.c2{padding:34px 36px}
.tab{width:100%;border-collapse:collapse;table-layout:fixed}
.tab th{font:800 21px/1.15 Inter;color:#8fe9c2;text-align:right;padding:0 0 12px 12px;vertical-align:bottom;letter-spacing:0}
.tab th:first-child{text-align:left}
.tab th small{display:block;font:600 21px/1.2 Inter;color:#9fb8ad;margin-top:4px;letter-spacing:0}
.tab td{font:800 36px Inter;color:#fff;text-align:right;border-top:1px solid rgba(143,233,194,.18);padding:0}
.tab td.nm{text-align:left;font:700 26px/1.1 Inter;color:#fff}
.tab td.nm i{display:block;font-style:normal;font-weight:600;color:#9fb8ad;font-size:20px;margin-top:3px}
.tab td.ld{color:#2EDC8A;text-shadow:0 0 14px rgba(46,220,138,.6)}
.tab td.mn{color:#cfe9dd;font-weight:600}
.tab tr.sl td{border-top:0;height:46px;vertical-align:middle}
.selo{display:inline-block;font:800 17px/1.15 Inter;letter-spacing:.04em;text-transform:uppercase;color:#04150c;background:#2EDC8A;border-radius:9px;padding:5px 9px;box-shadow:0 0 14px rgba(46,220,138,.55);text-align:center}
.fichas{font:500 22px/1.42 Inter;color:#9fb8ad;margin-top:16px}
.fichas b{color:#cfe9dd;font-weight:700}
.nota{font:500 22px/1.4 Inter;color:#9fb8ad;margin-top:14px}
.duelo .tt{display:flex;justify-content:space-between;align-items:center;gap:12px;font:500 23px/1.2 Inter;color:#9fb8ad;height:42px}
.duelo .tt b{color:#fff;font:800 27px Inter}
.duelo .bar{display:flex;height:62px;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.08);margin:6px 0 24px}
.duelo .seg{height:100%;display:flex;align-items:center;font:800 29px Inter;color:#04150c;white-space:nowrap;padding:0 16px;background:linear-gradient(90deg,#1baf7a,#2EDC8A);box-shadow:0 0 18px rgba(46,220,138,.55)}
.duelo .seg.d{justify-content:flex-end;background:linear-gradient(270deg,#1baf7a,#2EDC8A)}
.duelo .meio{flex:1;display:flex;align-items:center;justify-content:center}
.pres td{height:73px;vertical-align:top;padding-top:7px}
.pres td.nm{font:800 27px/1.15 Inter}
.pres td.nm span{font:600 21px Inter;color:#9fb8ad;margin-left:6px}
.pres td.nm i{font-size:19px;margin-top:4px;display:block}
.pres td.vv{font:800 31px/1.15 Inter;text-align:center}
.pres td.vv em{font-style:normal;color:#fff}
.pres td.vv em.ld{color:#2EDC8A;text-shadow:0 0 12px rgba(46,220,138,.6)}
.pres td.vv .x{color:#9fb8ad;font-weight:600;margin:0 6px}
.pres td.vv .selo{display:block;width:max-content;margin:6px auto 0;font-size:14px;padding:3px 8px}
.pres th{text-align:center}
`;
const CAB = `<div class="p cab">RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>`;
const chip = (t, topo = 290) => `<div class="p" style="top:${topo}px"><span class="chip">${esc(t)}</span></div>`;
const sub = (topo, html) => `<div class="p sub2" style="top:${topo}px">${html}</div>`;
// pílulas em fluxo (dentro de `abaixo`); as que ainda não entraram ficam
// invisíveis para a posição das outras não mudar entre as camadas
const pillsFluxo = (itens) => `<div style="margin-top:22px">${itens.map(([t, vis]) => `<span class="pill" style="font-size:33px;padding:14px 24px;${vis ? "" : "visibility:hidden"}">${esc(t)}</span>`).join("")}</div>`;
// selos de empate técnico numa camada própria: o mesmo bloco, com tudo
// invisível menos os selos (alinhamento exato); na camada 0 eles ficam ocultos
const soSelos = (html) => `<div style="visibility:hidden">${html.replace(/class="selo"/g, 'class="selo" style="visibility:visible"')}</div>`;
const semSelos = (html) => html.replace(/class="selo"/g, 'class="selo" style="visibility:hidden"');

const PART = { [PIV]: "Republicanos", [WEL]: "PL", "Doutora Natasha": "PSD", "Sargento Laudicério": "Agir", "Maurício Coelho": "Mobiliza", "Rafaell Milas": "Missão" };
const GOV6 = Object.keys(PART);
const PS = { [MAU]: "União", [JAN]: "MDB", [MED]: "PL", "Pedro Taques": "PSB", "Fávaro": "PSD", "Galvan": "Avante", "Margareth Buzetti": "PP", "Coronel Darwin": "Democrata", "Professor Nelson Ferreira": "Agir", "Beny Godoy": "Agir" };
const SEN10 = Object.keys(PS);
const ordena = (v, nomes) => [...nomes].sort((a, b) => (v[b] ?? 0) - (v[a] ?? 0) || a.localeCompare(b, "pt"));
const fichaCurta = (q, reg = regMT(q.reg)) => `<b>${esc(q.inst)}</b> · ${campoCurto(q.campo)} · ${esc(q.amostra)} entrevistas · ±${esc(q.margem)} · ${esc(reg)}`;
const contr = (q) => (q.contratante === "recursos próprios" ? "recursos próprios" : `contratada por ${q.contratante}`);
const fichaLonga = (q, metodo, extra = "") =>
  esc(`${q.inst} · ${contr(q)} · ${q.amostra} entrevistas ${metodo} · campo de ${q.campo} · margem de ${q.margem} pontos · confiança de ${q.conf || 95}% · registro ${regMT(q.reg)}${extra}`);
const CRITERIO = "Empate técnico: diferença menor que duas vezes a margem de erro. ± = margem de erro, em pontos; confiança de 95%.";

// barras (como no nº 3 e no nº 5), alinhadas por camada (`.lay`)
function barras(v, nomes, { max = 50, pq = false, partidos = {} } = {}) {
  return nomes.map((nm) => {
    const x = v[nm] ?? 0;
    return `<div class="row${pq ? " pq" : ""}"><div class="n">${esc(nm)}${partidos[nm] ? `<i>${esc(partidos[nm])}</i>` : ""}</div><div class="v">${pct(x)}</div><div class="t"><div class="f" style="width:${Math.max(0.6, (x / max) * 100).toFixed(1)}%"></div></div></div>`;
  });
}
const TOPO = 450;
const lay = (k, alt, html, topo = TOPO) => `<div class="p lay" style="top:${topo}px"><div style="height:${60 + k * alt}px"></div>${html}</div>`;
const resto = (k, alt, html) => `<div style="position:absolute;left:44px;right:44px;top:${100 + k * alt}px">${html}</div>`;
// cartões em fluxo dentro de um bloco no topo; `abaixo` reserva o espaço deles
// (invisíveis) para a peça da camada cair logo depois, sem sobrepor
const bloco = (cartoes, topo = TOPO) => `<div class="p" style="top:${topo}px">${cartoes}</div>`;
const abaixo = (cartoes, html, topo = TOPO) => `<div class="p" style="top:${topo}px"><div style="visibility:hidden">${cartoes}</div>${html}</div>`;

const cenas = [];

// 2 — governo, 1º turno: as cinco pesquisas, todos os candidatos (tabela)
{
  const cols = G; // ordem do Radar: da mais recente para a mais antiga
  const ordem = ordena(qGov.v, GOV6);
  const lider = (q) => Object.entries(q.v).sort((a, b) => b[1] - a[1])[0][0];
  const cab = `<tr><th style="width:300px;padding-left:0">Candidato</th>${cols.map((q) => `<th>${esc(q.inst.replace(" Pesquisas", "")).replace("MT Dados", "MT<br>Dados")}<small>${campoCurto(q.campo)}</small></th>`).join("")}</tr>`;
  const linhas = ordem.map((nm) => `<tr style="height:74px"><td class="nm">${esc(nm)}<i>${esc(PART[nm])}</i></td>${cols.map((q) => `<td class="${lider(q) === nm ? "ld" : [PIV, WEL].includes(nm) ? "" : "mn"}">${n(q.v[nm])}</td>`).join("")}</tr>`).join("");
  const selos = `<tr class="sl"><td></td>${cols.map((q) => `<td>${empate(q.v[PIV], q.v[WEL], q.margem) ? `<span class="selo">empate<br>técnico</span>` : ""}</td>`).join("")}</tr>`;
  const fichas = `<div class="fichas">${cols.map((q) => fichaCurta(q)).join("<br>")}</div><div class="nota">Votos totais, em %. ${esc(CRITERIO)} Contratantes e fichas completas: hojemt.com.br/radar-eleitoral</div>`;
  const cartao = `<div class="card c2"><table class="tab">${cab}${linhas}${selos}</table>${fichas}</div>`;
  const TOP = 440;
  const pills = (a, b) => pillsFluxo([["Pivetta à frente em 4", a], ["Wellington à frente em 1", b]]);
  cenas.push({
    fala: "A oito dias da eleição, as cinco pesquisas divulgadas para o governo de Mato Grosso desde quatro de setembro mostram Otaviano Pivetta e Wellington Fagundes nos dois primeiros lugares. Pivetta aparece à frente em quatro, e Wellington, em uma.",
    movimento: "zoom-in",
    pecas: [
      [0, CAB + chip("Governo de MT · 1º turno") + sub(378, "A 8 dias da eleição · <b>5 pesquisas divulgadas desde 4/9</b>")],
      [1, bloco(cartao, TOP)],
      [2, abaixo(cartao, pills(true, false), TOP)],
      [3, abaixo(cartao, pills(false, true), TOP)],
    ],
    quando: [null, "cinco pesquisas", "Pivetta aparece", "Wellington, em uma"],
  });
}

// 3 — governo, Quaest (a mais recente): os seis candidatos e a ficha completa
{
  const ALT = 104;
  const nomes = ordena(qGov.v, GOV6);
  const linhas = barras(qGov.v, nomes, { max: 45, partidos: PART });
  const cartao = `<div class="card" style="position:relative"><h3>1º turno · votos totais</h3>${resto(3, ALT, linhas.slice(3).join(""))}<div style="height:${nomes.length * ALT}px"></div><div class="ficha">${fichaLonga(qGov, "presenciais")}</div></div>`;
  const pill = `<div style="margin-top:28px"><span class="pill" style="font-size:36px">Empate técnico · margem de ${esc(qGov.margem)} pontos</span></div>`;
  cenas.push({
    fala: "Na Quaest, a mais recente, Pivetta tem vinte e nove por cento, e Wellington, vinte e sete, em empate técnico. Doutora Natasha tem onze.",
    movimento: "zoom-out",
    pecas: [
      [0, CAB + chip("Governo de MT · Quaest") + bloco(cartao)],
      [1, lay(0, ALT, linhas[0])],
      [2, lay(1, ALT, linhas[1])],
      [3, abaixo(cartao, pill)],
      [4, lay(2, ALT, linhas[2])],
    ],
    quando: [null, "Pivetta tem", "Wellington, vinte", "empate técnico", "Doutora Natasha"],
  });
}

// 4 — governo, 2º turno simulado nas cinco: Pivetta à esquerda e Wellington à
// direita em todas (lado fixo, ordem alfabética), selo de empate pelo critério
{
  const bloco2 = G.map((q) => {
    const s = t2(q);
    const L = s[PIV], R = s[WEL];
    const selo = empate(L, R, q.margem) ? `<span class="selo">empate<br>técnico</span>` : "";
    return `<div class="tt"><span>${fichaCurta(q)}</span></div><div class="bar"><div class="seg" style="width:${L}%">Pivetta ${pct(L)}</div><div class="meio">${selo}</div><div class="seg d" style="width:${R}%">Wellington ${pct(R)}</div></div>`;
  }).join("");
  const cartao = `<div class="card c2 duelo"><h3>2º turno simulado · votos totais</h3>${bloco2}<div class="nota" style="margin-top:0">Otaviano Pivetta (Republicanos) à esquerda e Wellington Fagundes (PL) à direita em todas; o espaço do meio corresponde a brancos, nulos e indecisos. ${esc(CRITERIO)}</div></div>`;
  const TOP = 400;
  const pills = (a, b) => pillsFluxo([["Pivetta à frente em 3", a], ["Wellington à frente em 2", b]]);
  cenas.push({
    fala: "No segundo turno simulado, Pivetta aparece à frente em três pesquisas, e Wellington, em duas, ambas dentro da margem de erro.",
    movimento: "pan-dir",
    pecas: [
      [0, CAB + chip("Governo de MT · 2º turno") + bloco(semSelos(cartao), TOP)],
      [1, abaixo(cartao, pills(true, false), TOP)],
      [2, abaixo(cartao, pills(false, true), TOP)],
      [3, `<div class="p" style="top:${TOP}px">${soSelos(cartao)}</div>`],
    ],
    quando: [null, "Pivetta aparece", "Wellington, em duas", "dentro da margem"],
  });
}

// 5 — Senado, Quaest: os dez candidatos no 1º voto, com indecisos e brancos
{
  const ALT = 76;
  const nomes = ordena(qSen.v, SEN10);
  const linhas = barras(qSen.v, nomes, { max: 45, pq: true, partidos: PS });
  const extra = ` · indecisos ${pct(qSen.v["Indecisos"])}, branco/nulo/não vai votar ${pct(qSen.v["Branco/nulo/não vai votar"])}`;
  const cartao = `<div class="card" style="position:relative"><h3>Duas vagas · 1º voto</h3>${resto(3, ALT, linhas.slice(3).join(""))}<div style="height:${nomes.length * ALT}px"></div><div class="ficha">${fichaLonga(qSen, "presenciais", extra)}</div></div>`;
  cenas.push({
    fala: "Para o Senado, na Quaest, Mauro Mendes tem trinta e sete por cento no primeiro voto; Janaina Riva, dezenove; e Zé Medeiros, onze.",
    movimento: "zoom-in",
    pecas: [
      [0, CAB + chip("Senado · Quaest") + bloco(cartao, 420)],
      [1, lay(0, ALT, linhas[0], 420)],
      [2, lay(1, ALT, linhas[1], 420)],
      [3, lay(2, ALT, linhas[2], 420)],
    ],
    quando: [null, "Mauro Mendes tem", "Janaina Riva, dezenove", "Zé Medeiros, onze"],
  });
}

// 6 — Senado: as quatro pesquisas desde 6/9 (três com o 1º voto, todos os
// candidatos; a Paraná de 6 a 8/9 só com a soma dos dois votos no Radar)
{
  const ordem = ordena(qSen.v, SEN10);
  const cab = `<tr><th style="width:340px;padding-left:0">Candidato</th>${sen1.map((q) => `<th>${esc(q.inst)}<small>${campoCurto(q.campo)}</small></th>`).join("")}</tr>`;
  const top2 = (q, nm) => [MAU, JAN].includes(nm) && topo2(Object.fromEntries(Object.entries(q.v).filter(([k]) => SEN10.includes(k)))).includes(nm);
  const linhas = ordem.map((nm) => `<tr style="height:60px"><td class="nm" style="font-size:26px">${esc(nm)} <span style="font:600 20px Inter;color:#9fb8ad">${esc(PS[nm])}</span></td>${sen1.map((q) => `<td class="${top2(q, nm) ? "ld" : "mn"}" style="font-size:31px">${pct(q.v[nm])}</td>`).join("")}</tr>`).join("");
  const somaTxt = senSoma.soma.replace(/^soma das menções, perto de 200%: /, "");
  const notas = `<div class="fichas">${sen1.map((q) => fichaCurta(q)).join("<br>")}<br><b>Paraná Pesquisas</b> · ${campoCurto(senSoma.campo)} · ${esc(senSoma.amostra)} entrevistas · ±${esc(senSoma.margem)} · ${esc(regMT(senSoma.reg))} · no Radar, só a soma dos dois votos (perto de 200%): ${esc(somaTxt)}</div>` +
    `<div class="nota">1º voto, votos totais.</div>`;
  const cartao = `<div class="card c2"><table class="tab">${cab}${linhas}</table>${notas}</div>`;
  const TOP = 400;
  const pill = `<div style="margin-top:22px"><span class="pill" style="font-size:33px;padding:14px 24px">Mauro e Janaina à frente nas 4</span></div>`;
  cenas.push({
    fala: "Mauro e Janaina lideram em todas as quatro pesquisas divulgadas desde seis de setembro.",
    movimento: "zoom-out",
    pecas: [
      [0, CAB + chip("Senado · 4 pesquisas desde 6/9") + bloco(cartao, TOP)],
      [1, abaixo(cartao, pill, TOP)],
    ],
    quando: [null, "lideram"],
  });
}

// 7 — Presidência: as 11 nacionais (rodada mais recente de cada instituto),
// 1º e 2º turno Lula × Flávio, ficha curta em cada linha
{
  const par = (l, f, m) => `<td class="vv"><em class="${l > f ? "ld" : ""}">${n(l)}</em><span class="x">×</span><em class="${f > l ? "ld" : ""}">${n(f)}</em>${empate(l, f, m) ? `<span class="selo">empate técnico</span>` : ""}</td>`;
  const tabela = `<table class="tab pres"><tr><th style="width:420px;text-align:left;padding-left:0">Instituto · campo</th><th>1º turno<small>Lula × Flávio</small></th><th>2º turno<small>Lula × Flávio</small></th></tr>` +
    P.map((q) => { const s = t2(q); return `<tr><td class="nm">${esc(q.inst)}<span>${campoCurto(q.campo)}</span><i>${esc(q.amostra)} entrevistas · ±${esc(q.margem)} · ${esc(regBR(q.reg))}</i></td>${par(q.v[LU], q.v[FL], q.margem)}${par(s[LU], s[FL], q.margem)}</tr>`; }).join("") + `</table>`;
  const nota = `<div class="nota" style="margin-top:10px">A rodada mais recente de cada instituto, com campo entre 14 e 23/9. Lula (PT) × Flávio Bolsonaro (PL), votos totais em %; em verde, quem está à frente. Nenhum outro candidato passa de ${outros}%. Empate técnico: diferença menor que duas vezes a margem (±, em pontos).</div>`;
  const cartao = `<div class="card c2" style="padding-top:28px;padding-bottom:28px">${tabela}${nota}</div>`;
  const TOP = 520;
  const c1 = conta(p1), c2 = conta(p2);
  const resumo = `<div class="p" style="top:384px"><span class="pill" style="font-size:27px;padding:10px 20px;margin-bottom:12px">1º turno: Lula à frente em ${c1.lula}, Flávio em ${c1.flavio}; números iguais em ${c1.iguais}</span><span class="pill" style="font-size:27px;padding:10px 20px;margin-bottom:0">2º turno: Flávio à frente em ${c2.flavio}, Lula em ${c2.lula}; números iguais em ${c2.iguais}</span></div>`;
  cenas.push({
    fala: "Para presidente, Lula e Flávio Bolsonaro disputam o topo nas onze pesquisas nacionais, quase sempre em empate técnico.",
    movimento: "pan-esq",
    pecas: [
      [0, CAB + chip("Presidência · 11 pesquisas nacionais") + bloco(semSelos(cartao), TOP)],
      [1, resumo],
      [2, `<div class="p" style="top:${TOP}px">${soSelos(cartao)}</div>`],
    ],
    quando: [null, "disputam o topo", "empate técnico"],
  });
}

// 8 — Presidência em Mato Grosso: Quaest (1º e 2º turno) e o fecho das pesquisas
{
  const ALT = 104;
  const nomes = [FL, LU];
  const PP = { [FL]: "PL", [LU]: "PT" };
  const l1 = barras(MTP, nomes, { max: 60, partidos: PP });
  const l2 = barras(MTP2, nomes, { max: 60, partidos: PP }).join("");
  const ficha = esc(`Quaest · ${qGov.amostra} entrevistas presenciais · campo de 21 a 24/09 · margem de ${qGov.margem} pontos · confiança de 95% · registros MT-08098/2026 e BR-09594/2026 · só Flávio e Lula têm números no Radar para esta pesquisa`);
  const card1 = `<div class="card" style="position:relative"><h3>1º turno · votos totais</h3><div style="height:${2 * ALT}px"></div><div class="ficha">${ficha}</div></div>`;
  const card2 = `<div class="card" style="margin-top:26px"><h3>2º turno simulado</h3>${l2}</div>`;
  const TOP = 440;
  cenas.push({
    fala: "Em Mato Grosso, a Quaest mostra Flávio com cinquenta por cento e Lula com vinte e cinco. No segundo turno, Flávio tem cinquenta e seis, e Lula, trinta. Pesquisa é retrato do momento.",
    movimento: "zoom-in",
    pecas: [
      [0, CAB + chip("Presidência · Mato Grosso") + bloco(card1, TOP)],
      [1, lay(0, ALT, l1[0], TOP)],
      [2, lay(1, ALT, l1[1], TOP)],
      [3, abaixo(card1, card2, TOP)],
      [4, abaixo(card1 + card2, `<div style="margin-top:34px"><span class="chip">Pesquisa é retrato do momento</span></div>`, TOP)],
    ],
    quando: [null, "Flávio com", "Lula com", "No segundo turno", "retrato do momento"],
  });
}

// todo `quando` tem de estar na fala (o charge-cena.mjs também confere)
for (const [i, c] of cenas.entries())
  for (const q of c.quando) if (q && !c.fala.toLowerCase().includes(q.toLowerCase())) throw new Error(`cena ${i + 2}: trecho "${q}" não está na fala`);
// sem nome de avatar em nenhuma fala ou peça (o nome não fica escrito aqui)
const PROIBIDO = new RegExp("\\b(" + [[97, 114, 103, 111, 115], [118, 101, 114, 101, 100, 97, 115]].map((c) => String.fromCharCode(...c)).join("|") + ")\\b|avatar", "i");
for (const c of cenas) if (PROIBIDO.test(c.fala + c.pecas.map(([, h]) => h).join(""))) throw new Error("nome do avatar no slide ou na fala");

// ------------------------------------------------------------ render
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const roteiro = [];
const transbordou = [];
// registros de pesquisa (MT-00000/2026, BR-…) nunca quebram no hífen
const semQuebra = (html) => html.replace(/\b((?:MT|BR)-\d{5}\/\d{4})/g, '<span style="white-space:nowrap">$1</span>');
for (const c of cenas) c.pecas = c.pecas.map(([j, h]) => [j, semQuebra(h)]);
for (const [i, c] of cenas.entries()) {
  const k = i + 1;
  const arq = (suf) => `${PREFIXO}-${k}-${suf}.png`;
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(k * 11 + 5)}</body></html>`);
  await page.screenshot({ path: join(OUT, arq("fundo")) });
  const camadas = [...new Set(c.pecas.map(([kk]) => kk))].sort((a, b) => a - b);
  const lista = [];
  for (const j of camadas) {
    const html = c.pecas.filter(([kk]) => kk === j).map(([, h]) => h).join("");
    await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(OUT, arq(`c${j}`)), omitBackground: true });
    lista.push({ imagem: `${PASTA}/cenas/${arq(`c${j}`)}`, ...(c.quando[j] ? { quando: c.quando[j] } : { em: 0 }) });
  }
  // prévia com tudo junto (conferência; fica no scratchpad) + área útil (y 180 a 1600)
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(k * 11 + 5)}${c.pecas.map(([, h]) => h).join("")}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const fundoMax = await page.evaluate(() => {
    let max = 0, larg = 0;
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("svg") || getComputedStyle(el).visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.height && r.width) { max = Math.max(max, r.bottom); larg = Math.max(larg, r.right); }
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === "hidden") larg = 9999;
    }
    return { max: Math.round(max), larg: Math.round(larg) };
  });
  if (fundoMax.max > 1600 || fundoMax.larg > 1080) transbordou.push(`cena ${k + 1}: vai até y=${fundoMax.max}, x=${fundoMax.larg}`);
  await page.screenshot({ path: join(PREVIA, `${k}.png`) });
  roteiro.push({ n: k + 1, quem: "narrador", fala: c.fala, imagem: `${PASTA}/cenas/${arq("fundo")}`, movimento: c.movimento, camadas: lista, _limite: fundoMax });
}

// montagem: intro + cenas + fechamento, em 3 colunas
const imgs = [join(SCRATCH, `${PREFIXO}-intro-previa.png`), ...cenas.map((_, i) => join(PREVIA, `${i + 1}.png`)), join(SCRATCH, `${PREFIXO}-fecho-previa.png`)];
const b64 = (p) => readFileSync(p).toString("base64");
const COLS = 3, LW = 540, LH = 960, linhasM = Math.ceil(imgs.length / COLS);
await page.setViewportSize({ width: COLS * LW + (COLS + 1) * 20, height: linhasM * (LH + 60) + 20 });
await page.setContent(`<!doctype html><html style="width:auto;height:auto;overflow:visible"><head><style>${fontes}*{margin:0;padding:0;box-sizing:border-box}</style></head><body style="background:#111;font-family:Inter,sans-serif;padding:20px 0 0 20px;display:grid;grid-template-columns:repeat(${COLS},${LW}px);gap:60px 20px">${imgs.map((p, i) => `<div><div style="font:700 26px Inter;color:#8fe9c2;height:34px">Cena ${i + 1}${i === 0 ? " · intro" : i === imgs.length - 1 ? " · fechamento" : ""}</div><img src="data:image/png;base64,${b64(p)}" style="width:${LW}px;height:${LH}px;display:block"></div>`).join("")}</body></html>`);
await page.evaluate(() => document.fonts.ready);
const MONTAGEM = join(SCRATCH, "b1-slides-montagem.png");
await page.screenshot({ path: MONTAGEM });
await browser.close();

writeFileSync(join(SCRATCH, "b1-cenas.json"), JSON.stringify(roteiro, null, 1));
const palavras = cenas.reduce((s, c) => s + c.fala.trim().split(/\s+/).length, 0);
console.log(`${cenas.length} cenas de conteúdo, ${palavras} palavras de fala (sem intro e fechamento); roteiro parcial em ${join(SCRATCH, "b1-cenas.json")}; prévias em ${PREVIA}; montagem em ${MONTAGEM}`);
if (transbordou.length) console.log("ATENÇÃO, fora da área útil:\n- " + transbordou.join("\n- "));
