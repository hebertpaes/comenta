// Slides (1080×1920) do boletim em vídeo nº 6 — formato "só voz e slides"
// (editor, 29/09), sem música, com intro e fechamento padrão (editor, 01 e 02/10).
// Tema: o que mudou no Radar depois do boletim nº 5 (02/10, 07:38 MT): a
// pesquisa MT Dados para o governo e o Senado (MT-07362/2026), a ordem do TRE-MT
// para as emissoras exibirem o tempo de propaganda de Natasha, as multas a Pedro
// Taques e o apoio do vice de Flávio Bolsonaro a Wellington Fagundes.
// Dados: content/paginas/radar-dados.json; o script confere números e casos antes
// de desenhar (a fala tem de bater com o slide).
// A intro (cena 1) sai do intro-boletim.mjs e o fechamento (última cena) do
// fechamento-boletim.mjs; aqui ficam as cenas 2 a 7 (arquivos <prefixo>-1… a -6…).
// Regras: pesquisa com ficha técnica no slide e todos os candidatos da ficha;
// nunca a Veritá MT-09975/2026 (suspensa); casos judiciais sem descrever o
// conteúdo das acusações nem das propagandas.
// Uso: node graficos-boletim-06.mjs
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { SCRATCH, esc, pct, fundo, CSS } from "./slides-lib.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const PASTA = "pautas/videos/argos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-10-02-boletim-06";
const PREVIA = join(SCRATCH, "b6-previa");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

// ------------------------------------------------------------ conferência dos dados
const radar = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8"));
const erros = [];
const confere = (rot, radarV, falaV) => {
  if (radarV !== falaV) erros.push(`${rot}: Radar ${JSON.stringify(radarV)} × fala ${JSON.stringify(falaV)}`);
};

const corrida = (id) => radar.pesquisas.corridas.find((c) => c.id === id);
const gov = corrida("governador-mt"),
  sen = corrida("senado-mt");
const achar = (c, inst, reg) => c.pesquisas.find((q) => q.inst === inst && q.reg.includes(reg));
const mGov = achar(gov, "MT Dados", "MT-07362");
const mSen = achar(sen, "MT Dados", "MT-07362");
if (!mGov || !mSen) throw new Error("pesquisa MT Dados MT-07362/2026 não encontrada no Radar (governo e Senado)");
if ([mGov, mSen].some((q) => /MT-09975/.test(q.reg) || /verit/i.test(q.inst))) throw new Error("pesquisa suspensa (Veritá) no boletim");
confere("MT Dados/governo Pivetta", mGov.v["Otaviano Pivetta"], 42);
confere("MT Dados/governo Wellington", mGov.v["Wellington Fagundes"], 23);
confere("MT Dados/governo Natasha", mGov.v["Doutora Natasha"], 14);
confere("MT Dados/governo Laudicério", mGov.v["Sargento Laudicério"], 2);
confere("MT Dados/governo Milas", mGov.v["Rafaell Milas"], 1);
confere("MT Dados/governo Coelho", mGov.v["Maurício Coelho"], 1);
confere("MT Dados/2º turno", JSON.stringify(mGov.t2?.[0]), JSON.stringify(["Otaviano Pivetta", 50, "Wellington Fagundes", 28]));
confere("MT Dados/margem", mGov.margem, "3");
confere("MT Dados/Senado Mauro", mSen.v["Mauro Mendes"], 32);
confere("MT Dados/Senado Janaina", mSen.v["Janaina Riva"], 19);
confere("MT Dados/Senado Medeiros", mSen.v["Zé Medeiros"], 16);
if (!/Mauro Mendes 50%, Janaina Riva 36%, Zé Medeiros 31%/.test(mSen.soma)) erros.push("soma dos votos do Senado (50, 36, 31) não confere com o Radar");

const itens = (nome) => radar.justica.candidatos.find((c) => c.nome === nome)?.itens || [];
const emissoras = itens("Doutora Natasha").find((i) => i.data === "2026-10-02" && /presidência/.test(i.orgao) && /\(2\/10\) e no sábado \(3\/10\)/.test(i.resumo));
const multasTaques = itens("Pedro Taques").find((i) => i.data === "2026-10-01" && i.tipo === "decisao" && /duas representações/.test(i.resumo) && /R\$ 30 mil/.test(i.resumo));
if (!emissoras) erros.push("ordem do TRE-MT às emissoras (Natasha, 2/10) não está no Radar");
if (!multasTaques || multasTaques.cabe_recurso !== true) erros.push("multas a Taques (1º/10, cabe recurso) não conferem com o Radar");
const movs = radar.grupos.grupos.flatMap((g) => g.movimentos || []);
const gaspar = movs.find((m) => m.data === "2026-10-02" && /Alfredo Gaspar/.test(m.fato) && /Wellington/.test(m.fato));
if (!gaspar) erros.push("apoio de Alfredo Gaspar a Wellington (2/10) não está em grupos");
if (erros.length) throw new Error("o Radar mudou; ajuste a fala e o slide:\n- " + erros.join("\n- "));

// ------------------------------------------------------------ peças
const CAB = `<div class="p cab">RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>`;
const chip = (t, topo = 330) => `<div class="p" style="top:${topo}px"><span class="chip">${esc(t)}</span></div>`;
const tit = (html, topo = 470) => `<div class="p tit" style="top:${topo}px">${html}</div>`;
const nota = (topo, texto) => `<div class="p ficha" style="top:${topo}px;font-size:27px">${esc(texto)}</div>`;
const linha = (topo, rotulo, texto, detalhe) =>
  `<div class="p card" style="top:${topo}px;padding:30px 40px"><h3 style="font-size:28px;height:44px;line-height:44px">${esc(rotulo)}</h3><div class="sub" style="font-size:38px;color:#fff;font-weight:700">${esc(texto)}</div><div class="ficha" style="margin-top:10px">${esc(detalhe)}</div></div>`;

function barras(v, nomes, { max = 60, pq = true, partidos = {} } = {}) {
  return nomes.map((n) => {
    const x = v[n] ?? 0;
    return `<div class="row${pq ? " pq" : ""}"><div class="n">${esc(n)}${partidos[n] ? `<i>${esc(partidos[n])}</i>` : ""}</div><div class="v">${pct(x)}</div><div class="t"><div class="f" style="width:${Math.max(0.6, (x / max) * 100).toFixed(1)}%"></div></div></div>`;
  });
}
const ordena = (v, nomes) => [...nomes].sort((a, b) => (v[b] ?? 0) - (v[a] ?? 0) || a.localeCompare(b, "pt"));
const regCurto = (r) => r.replace(/\s*\(.*$/, "");
const contr = (q) =>
  q.contratante === "recursos próprios"
    ? "recursos próprios"
    : /^não informado/.test(q.contratante)
      ? "contratante não informado no relatório nem nas matérias"
      : `contratada por ${q.contratante}`;
const ficha = (q, metodo, extra = "") =>
  esc(`${q.inst} · ${contr(q)} · ${q.amostra} entrevistas ${metodo} · campo de ${q.campo} · margem de ${q.margem} pontos · confiança de ${q.conf || 95}% · registro ${regCurto(q.reg)}${extra}`);

const PART = { "Otaviano Pivetta": "Republicanos", "Wellington Fagundes": "PL", "Doutora Natasha": "PSD", "Sargento Laudicério": "Agir", "Maurício Coelho": "Mobiliza", "Rafaell Milas": "Missão" };
const GOV6 = Object.keys(PART);
const PS = { "Mauro Mendes": "União", "Janaina Riva": "MDB", "Zé Medeiros": "PL", "Pedro Taques": "PSB", "Fávaro": "PSD", "Galvan": "Avante", "Margareth Buzetti": "PP", "Coronel Darwin": "Democrata", "Professor Nelson Ferreira": "Agir", "Beny Godoy": "Agir" };
const SEN10 = Object.keys(PS);

const TOPO = 450,
  ALT = 76;
const lay = (k, html) => `<div class="p lay" style="top:${TOPO}px"><div style="height:${60 + k * ALT}px"></div>${html}</div>`;
const resto = (k, html) => `<div style="position:absolute;left:44px;right:44px;top:${100 + k * ALT}px">${html}</div>`;
const bloco = (cartoes) => `<div class="p" style="top:${TOPO}px">${cartoes}</div>`;
const abaixo = (cartoes, html) => `<div class="p" style="top:${TOPO}px"><div style="visibility:hidden">${cartoes}</div>${html}</div>`;
const pillFluxo = (t) => `<div style="margin-top:30px"><span class="pill" style="font-size:36px">${esc(t)}</span></div>`;

function cartaoPesquisa(q, nomesTodos, partidos, { h3, metodo, extra = "", destaques = 3, max = 60, segundo = true }) {
  const nomes = ordena(q.v, nomesTodos.filter((n) => n in q.v));
  const linhas = barras(q.v, nomes, { max, partidos });
  let cartoes = `<div class="card" style="position:relative"><h3>${esc(h3)}</h3>${resto(destaques, linhas.slice(destaques).join(""))}<div style="height:${nomes.length * ALT}px"></div><div class="ficha">${ficha(q, metodo, extra)}</div></div>`;
  let segundoTurno = "";
  if (segundo && q.t2?.length) {
    const [a, va, b, vb] = q.t2[0];
    segundoTurno = `<div class="card" style="margin-top:26px"><h3>2º turno simulado · votos totais</h3>${barras({ [a]: va, [b]: vb }, [a, b], { max, partidos }).join("")}</div>`;
  }
  return { nomes, linhas, cartoes, segundoTurno };
}

const cenas = [];

// 1 — a notícia principal: MT Dados para o governo (os seis candidatos no cartão)
{
  const { linhas, cartoes } = cartaoPesquisa(mGov, GOV6, PART, { h3: "1º turno · votos totais", metodo: "presenciais e online", segundo: false });
  cenas.push({
    fala: "Na pesquisa MT Dados, feita de vinte e cinco a trinta de setembro, Otaviano Pivetta tem quarenta e dois por cento para o governo; Wellington Fagundes, vinte e três; e Doutora Natasha, catorze.",
    movimento: "zoom-in",
    pecas: [
      [0, CAB + chip("Governo de MT · MT Dados") + bloco(cartoes)],
      [1, lay(0, linhas[0])],
      [2, lay(1, linhas[1])],
      [3, lay(2, linhas[2])],
    ],
    quando: [null, "Otaviano Pivetta tem", "Wellington Fagundes, vinte", "Doutora Natasha, catorze"],
  });
}

// 2 — os outros três candidatos e o 2º turno simulado; fecha com a ressalva
{
  const { cartoes, segundoTurno } = cartaoPesquisa(mGov, GOV6, PART, { h3: "1º turno · votos totais", metodo: "presenciais e online", destaques: 0 });
  cenas.push({
    fala: "Sargento Laudicério tem dois por cento; Rafaell Milas e Maurício Coelho, um cada. No segundo turno simulado, Pivetta tem cinquenta, e Wellington, vinte e oito. Pesquisa é retrato do momento.",
    movimento: "zoom-out",
    pecas: [
      [0, CAB + chip("Governo de MT · MT Dados") + bloco(cartoes)],
      [1, abaixo(cartoes, segundoTurno)],
      [2, abaixo(cartoes + segundoTurno, `<div style="margin-top:30px"><span class="chip">Pesquisa é retrato do momento</span></div>`)],
    ],
    quando: [null, "segundo turno simulado", "retrato do momento"],
  });
}

// 3 — Senado: MT Dados, 1º voto, os dez candidatos; soma dos dois votos na fala e na ficha
{
  const extra = ` · branco/nulo ${pct(mSen.v["Branco/nulo"])}, indecisos ${pct(mSen.v["Indecisos"])} · soma dos dois votos: Mauro Mendes 50%, Janaina Riva 36%, Zé Medeiros 31%`;
  const { linhas, cartoes } = cartaoPesquisa(mSen, SEN10, PS, { h3: "Duas vagas · 1º voto", metodo: "presenciais e online", extra, max: 50, segundo: false });
  cenas.push({
    fala: "Para o Senado, na mesma pesquisa, Mauro Mendes tem trinta e dois por cento no primeiro voto; Janaina Riva, dezenove; e Zé Medeiros, dezesseis. Na soma dos dois votos, cinquenta, trinta e seis e trinta e um.",
    movimento: "pan-dir",
    pecas: [
      [0, CAB + chip("Senado · MT Dados") + bloco(cartoes)],
      [1, lay(0, linhas[0])],
      [2, lay(1, linhas[1])],
      [3, lay(2, linhas[2])],
      [4, abaixo(cartoes, pillFluxo("Soma dos dois votos: 50% · 36% · 31%"))],
    ],
    quando: [null, "Mauro Mendes tem", "Janaina Riva, dezenove", "Zé Medeiros, dezesseis", "soma dos dois votos"],
  });
}

// 4 — Justiça Eleitoral: a presidente do TRE-MT cumpre a decisão do STF
// (sem descrever o conteúdo das propagandas; o outro lado no rodapé)
cenas.push({
  fala: "No TRE, a presidente, desembargadora Serly Marcondes Alves, mandou rádios e TVs exibirem nesta sexta e no sábado o tempo de propaganda de Doutora Natasha que tinha sido suspenso, cumprindo decisão do Supremo.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral · 2/10") + tit("Natasha recupera<br>o tempo de<br><b>rádio e TV</b>")],
    [1, linha(800, "Presidência do TRE-MT · 2/10", "Desembargadora Serly Marcondes Alves manda emissoras exibirem o tempo suprimido em 2 e 3/10", "Dentro do plano de mídia e do limite do tempo que não foi ao ar")],
    [2, linha(1160, "Cumprimento da decisão do STF", "Reclamação nº 100.717/MT · ministro Alexandre de Moraes", "Decisão do STF de 1º/10 cassou as suspensões do TRE-MT") +
      nota(1470, "As matérias não trazem manifestação de Otaviano Pivetta (Republicanos) ou da coligação dele sobre esta decisão.")],
  ],
  quando: [null, "mandou rádios", "cumprindo decisão"],
});

// 5 — Justiça Eleitoral na disputa pelo Senado: multas a Taques (cabe recurso)
cenas.push({
  fala: "A pedido da coligação de Mauro Mendes, um juiz auxiliar multou Pedro Taques em duas representações, em valores que somam mais de trinta mil reais. Cabe recurso.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral · Senado")],
    [1, linha(480, "Juiz auxiliar da propaganda · TRE-MT · 1º/10", "Pedro Taques (PSB) multado em duas representações", "Valores que somam mais de R$ 30 mil · pedido da coligação Mato Grosso Não Pode Parar, de Mauro Mendes (União)")],
    [2, `<div class="p" style="top:860px"><span class="pill" style="font-size:38px">Cabe recurso</span></div>` +
      nota(990, "O juiz negou o pedido para retirar as entrevistas do ar. As matérias não trazem manifestação de Taques sobre as decisões.")],
  ],
  quando: [null, "multou Pedro Taques", "Cabe recurso"],
});

// 6 — grupos: apoio do vice de Flávio Bolsonaro a Wellington
cenas.push({
  fala: "Nos grupos, o deputado federal Alfredo Gaspar, candidato a vice na chapa de Flávio Bolsonaro, declarou apoio a Wellington Fagundes em vídeo.",
  movimento: "pan-esq",
  pecas: [
    [0, CAB + chip("Grupos · 2/10") + tit("Apoio na<br><b>reta final</b>")],
    [1, linha(720, "Coligação de Wellington Fagundes (PL)", "Alfredo Gaspar (PL-AL) declarou apoio a Wellington", "Deputado federal e candidato a vice-presidente na chapa de Flávio Bolsonaro · vídeo gravado ao lado de Wellington") +
      nota(1080, "Fontes: MidiaNews e Folhamax, 2/10.")],
  ],
  quando: [null, "Alfredo Gaspar"],
});

for (const [i, c] of cenas.entries())
  for (const q of c.quando) if (q && !c.fala.toLowerCase().includes(q.toLowerCase())) throw new Error(`cena ${i + 2}: trecho "${q}" não está na fala`);

// ------------------------------------------------------------ render
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const roteiro = [];
for (const [i, c] of cenas.entries()) {
  const n = i + 1;
  const arq = (suf) => `${PREFIXO}-${n}-${suf}.png`;
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 13 + 5)}</body></html>`);
  await page.screenshot({ path: join(OUT, arq("fundo")) });
  const camadas = [...new Set(c.pecas.map(([k]) => k))].sort((a, b) => a - b);
  const lista = [];
  for (const k of camadas) {
    const html = c.pecas.filter(([kk]) => kk === k).map(([, h]) => h).join("");
    await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(OUT, arq(`c${k}`)), omitBackground: true });
    lista.push({ imagem: `${PASTA}/cenas/${arq(`c${k}`)}`, ...(c.quando[k] ? { quando: c.quando[k] } : { em: 0 }) });
  }
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 13 + 5)}${c.pecas.map(([, h]) => h).join("")}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(PREVIA, `${n}.png`) });
  roteiro.push({ n: n + 1, quem: "narrador", fala: c.fala, imagem: `${PASTA}/cenas/${arq("fundo")}`, movimento: c.movimento, camadas: lista });
}
await browser.close();
writeFileSync(join(SCRATCH, "b6-cenas.json"), JSON.stringify(roteiro, null, 1));
const palavras = cenas.reduce((s, c) => s + c.fala.trim().split(/\s+/).length, 0);
console.log(`${cenas.length} cenas, ${palavras} palavras de fala (sem intro e fechamento); roteiro parcial em ${join(SCRATCH, "b6-cenas.json")}; prévias em ${PREVIA}`);
