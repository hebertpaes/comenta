/* global document */
// Slides (1080×1920) do boletim em vídeo nº 8 — formato "só voz e slides"
// (editor, 29/09), sem música, com intro e fechamento padrão (editor, 01 e 02/10).
// Tema: dia do 1º turno (domingo, 4/10): horário de votação (TRE-MT), as três
// pesquisas registradas divulgadas na véspera (Quaest MT-02649/2026, AtlasIntel
// MT-00323/2026 e Veritá MT-06765/2026; governo em votos válidos e Senado com os
// dois votos somados), a cola de Eduardo Bolsonaro (PL) com Pivetta e a liminar
// negada a Wellington Fagundes sobre reportagens de benefícios fiscais — o que
// entrou no Radar depois do boletim nº 7 (03/10, 07:05 MT).
// Dados: content/paginas/radar-dados.json; o script confere os itens antes de desenhar.
// A intro (cena 1) sai do intro-boletim.mjs e o fechamento (última cena) do
// fechamento-boletim.mjs; aqui ficam as cenas 2 a 6 (arquivos <prefixo>-1… a -5…).
// Regras: pesquisas com ficha e todos os candidatos divulgados; tratamento igual;
// caso judicial com a posição da defesa; listas fora de pesquisa em ordem alfabética.
// Uso: node graficos-boletim-08.mjs
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { SCRATCH, esc, fundo, CSS, pct } from "./slides-lib.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const PASTA = "pautas/videos/argos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-10-04-boletim-08";
const PREVIA = join(SCRATCH, "b8-previa");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

// ------------------------------------------------------------ confere no Radar
const radar = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8"));
const erros = [];
const corrida = (id) => radar.pesquisas.corridas.find((c) => c.id === id).pesquisas;
const acha = (id, reg) => corrida(id).find((q) => q.reg === reg);
const qg = acha("governador-mt", "MT-02649/2026"), ag = acha("governador-mt", "MT-00323/2026"), vg = acha("governador-mt", "MT-06765/2026");
const qs = acha("senado-mt", "MT-02649/2026"), as_ = acha("senado-mt", "MT-00323/2026"), vs = acha("senado-mt", "MT-06765/2026");
if (!qg || !ag || !vg || !qs || !as_ || !vs) erros.push("alguma das três pesquisas de 3/10 não está no Radar");
else {
  if (ag.base !== "validos" || ag.v["Otaviano Pivetta"] !== 54.3 || ag.v["Doutora Natasha"] !== 24.3 || ag.v["Wellington Fagundes"] !== 19.6) erros.push("AtlasIntel governo não confere");
  if (!/Pivetta 54%, Wellington 28%, Natasha 13%/.test(qg.obs)) erros.push("Quaest governo (válidos) não confere");
  if (!/Pivetta 53,7%, Wellington 27,1%, Natasha 16,3%/.test(vg.obs)) erros.push("Veritá governo (válidos) não confere");
  if (!/Mauro Mendes 37%, Janaina Riva 23%, Zé Medeiros 17%/.test(qs.soma)) erros.push("Quaest Senado não confere");
  if (!/Zé Medeiros 26,8%, Mauro Mendes 25,3%/.test(as_.soma)) erros.push("AtlasIntel Senado não confere");
  if (!/Mauro Mendes 57,4%, Zé Medeiros 39%, Janaina Riva 27,7%/.test(vs.soma)) erros.push("Veritá Senado não confere");
}
const grupo = (g) => radar.grupos.grupos.find((x) => x.governador === g).movimentos;
if (!grupo("Otaviano Pivetta").some((m) => m.data === "2026-10-04" && /Eduardo Bolsonaro/.test(m.fato))) erros.push("cola de Eduardo Bolsonaro não está nos grupos");
const wel = radar.justica.candidatos.find((c) => c.nome === "Wellington Fagundes").itens;
const caso = wel.find((i) => i.data === "2026-10-02" && /SGM/.test(i.resumo) && /negou a liminar/.test(i.resumo));
if (!caso || caso.tipo !== "acao_em_andamento") erros.push("liminar negada a Wellington (reportagens) não confere");
if (erros.length) throw new Error("o Radar mudou; ajuste a fala e o slide:\n- " + erros.join("\n- "));

// ------------------------------------------------------------ peças
const CAB = `<div class="p cab">RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>`;
const chip = (t, topo = 330) =>
  `<div class="p" style="top:${topo}px"><span class="chip">${esc(t)}</span></div>`;
const tit = (html, topo = 470) => `<div class="p tit" style="top:${topo}px">${html}</div>`;
const nota = (topo, texto) =>
  `<div class="p ficha" style="top:${topo}px;font-size:26px">${esc(texto)}</div>`;
const linha = (topo, rotulo, texto, detalhe) =>
  `<div class="p card" style="top:${topo}px;padding:30px 40px"><h3 style="font-size:28px;height:44px;line-height:44px">${esc(rotulo)}</h3><div class="sub" style="font-size:38px;color:#fff;font-weight:700">${esc(texto)}</div><div class="ficha" style="margin-top:10px">${esc(detalhe)}</div></div>`;
// cartão de pesquisa: lista completa como o instituto divulgou (barras proporcionais)
const pesq = (topo, rotulo, itens, ficha, escala = 60) => {
  const linhas = itens
    .map(([n, v], k) => `<div style="display:flex;align-items:center;gap:16px;margin:${k < 3 ? 8 : 3}px 0;font:${k < 3 ? "700 31px" : "500 24px"} Inter;color:${k < 3 ? "#fff" : "#cfe9dd"}"><span style="width:330px">${esc(n)}</span><span style="flex:1;height:${k < 3 ? 22 : 12}px;position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(0.5, (v / escala) * 100)}%;background:${k === 0 ? "#2EDC8A" : "rgba(46,220,138,.55)"};border-radius:8px"></i></span><b style="width:120px;text-align:right">${esc(pct(v))}</b></div>`)
    .join("");
  return `<div class="p card" style="top:${topo}px;padding:24px 36px"><h3 style="font-size:26px;height:40px;line-height:40px">${esc(rotulo)}</h3>${linhas}<div class="ficha" style="margin-top:8px;font-size:21px">${esc(ficha)}</div></div>`;
};

const cenas = [];

// 1 — a notícia principal: dia de votação; três pesquisas na véspera
cenas.push({
  fala: "Hoje é dia de eleição. Em Mato Grosso, a votação vai até as dezesseis horas, no horário local. Na véspera, saíram três pesquisas registradas para o governo e o Senado.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("1º turno · domingo, 4/10") + tit("Dia de<br><b>eleição</b>", 470)],
    [1, `<div class="p" style="top:760px"><span class="pill" style="font-size:42px">Votação até as 16h (horário de MT)</span></div>` + nota(880, "Das 7h às 16h, segundo o planejamento do TRE-MT (O Documento e MidiaJur, 2/10).")],
    [2, linha(1060, "Pesquisas registradas divulgadas em 3/10", "Quaest · AtlasIntel · Veritá", "Governo e Senado de Mato Grosso; as fichas completas estão no Radar Eleitoral")],
  ],
  quando: [null, "dezesseis horas", "três pesquisas"],
});

// 2 — governo, votos válidos (todas as candidaturas divulgadas por instituto)
cenas.push({
  fala: "Para o governo, em votos válidos, Otaviano Pivetta tem cinquenta e quatro por cento na Quaest, cinquenta e quatro vírgula três na AtlasIntel e cinquenta e três vírgula sete na Veritá. O segundo lugar é de Wellington Fagundes na Quaest e na Veritá, e de Doutora Natasha na AtlasIntel. Pesquisa é retrato do momento.",
  movimento: "pan-dir",
  pecas: [
    [0, CAB + chip("Governo de MT · votos válidos", 300)],
    [1, pesq(400, "Quaest · 2 e 3/10", [["Otaviano Pivetta", 54], ["Wellington Fagundes", 28], ["Doutora Natasha", 13], ["Sargento Laudicério", 3], ["Maurício Coelho", 1], ["Rafaell Milas", 1]],
      "MT-02649/2026 · contratada pela Rede Matogrossense de Comunicação · 1.800 entrevistas · margem de 2 pontos · confiança de 95%")],
    [2, pesq(870, "AtlasIntel · 27/9 a 2/10", [["Otaviano Pivetta", 54.3], ["Doutora Natasha", 24.3], ["Wellington Fagundes", 19.6], ["Rafaell Milas", 1], ["Sargento Laudicério", 0.7]],
      "MT-00323/2026 · recursos próprios · 1.200 entrevistas · margem de 3 pontos · confiança de 95% · Maurício Coelho não aparece na lista divulgada")],
    [3, pesq(1320, "Veritá · 26/9 a 1º/10", [["Otaviano Pivetta", 53.7], ["Wellington Fagundes", 27.1], ["Doutora Natasha", 16.3], ["Maurício Coelho", 2], ["Sargento Laudicério", 0.5], ["Rafaell Milas", 0.4]],
      "MT-06765/2026 · recursos próprios · 1.220 entrevistas · margem de 3 pontos · confiança de 95%")],
    [4, `<div class="p" style="top:1780px"><span class="pill" style="font-size:32px;padding:10px 22px">Pesquisa é retrato do momento</span></div>`],
  ],
  quando: [null, "na Quaest", "na AtlasIntel", "na Veritá", "retrato do momento"],
});

// 3 — Senado, dois votos somados (como cada instituto divulgou)
cenas.push({
  fala: "No Senado, com os dois votos somados, Mauro Mendes e Janaina Riva aparecem à frente na Quaest; Mauro e Zé Medeiros, na Veritá; e Zé Medeiros e Mauro, na AtlasIntel. Cada eleitor vota em dois nomes, e são duas vagas em disputa.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Senado · dois votos somados", 300)],
    [1, pesq(400, "Quaest · 2 e 3/10 · votos válidos, total de 100%", [["Mauro Mendes", 37], ["Janaina Riva", 23], ["Zé Medeiros", 17], ["Pedro Taques", 9], ["Fávaro", 9], ["Galvan", 2], ["Margareth Buzetti", 2], ["Coronel Darwin", 1], ["Prof. Nelson Ferreira", 0], ["Beny Godoy", 0]],
      "MT-02649/2026 · Rede Matogrossense de Comunicação · 1.800 entrevistas · margem de 2 pontos · 95%")],
    [2, pesq(940, "Veritá · 26/9 a 1º/10 · soma dos dois votos (200%)", [["Mauro Mendes", 57.4], ["Zé Medeiros", 39], ["Janaina Riva", 27.7], ["Fávaro", 25.1], ["Pedro Taques", 11.7], ["Coronel Darwin", 8.8], ["Galvan", 8.4], ["Beny Godoy", 7.8], ["Margareth Buzetti", 4.6], ["Prof. Nelson Ferreira", 0.2]],
      "MT-06765/2026 · recursos próprios · 1.220 entrevistas · margem de 3 pontos · 95%", 100)],
    [3, pesq(1460, "AtlasIntel · 27/9 a 2/10 · total de 100%", [["Zé Medeiros", 26.8], ["Mauro Mendes", 25.3], ["Fávaro", 14], ["Janaina Riva", 10.2], ["Pedro Taques", 9.3], ["Galvan", 7.3]],
      "MT-00323/2026 · recursos próprios · 1.200 entrevistas · margem de 3 pontos · 95% · outros 2,1%; branco/nulo 2%; indecisos 2,9%")],
  ],
  quando: [null, "na Quaest", "na Veritá", "na AtlasIntel"],
});

// 4 — grupos: a cola de Eduardo Bolsonaro
cenas.push({
  fala: "Neste domingo, o ex-deputado Eduardo Bolsonaro, do PL, publicou nas redes uma cola com Otaviano Pivetta para governador e Zé Medeiros para o Senado. Wellington Fagundes, candidato do PL ao governo, ficou fora da lista.",
  movimento: "pan-esq",
  pecas: [
    [0, CAB + chip("Apoios · 4/10")],
    [1, linha(480, "Eduardo Bolsonaro (PL) · cola eleitoral", "Governador: Otaviano Pivetta (Republicanos) · Senado: Zé Medeiros (PL)", "A lista traz também Flávio Bolsonaro para presidente e Coronel Assis para deputado federal; o segundo nome ao Senado aparece diferente nas matérias")],
    [2, `<div class="p" style="top:930px"><span class="pill" style="font-size:38px">Wellington Fagundes (PL) fora da lista</span></div>` + nota(1060, "Fontes: RepórterMT, HiperNotícias e Muvuca Popular, 4/10.")],
  ],
  quando: [null, "uma cola", "ficou fora"],
});

// 5 — Justiça Eleitoral: liminar negada a Wellington (com a posição da defesa)
cenas.push({
  fala: "Na Justiça Eleitoral, um juiz auxiliar do TRE negou a liminar pedida por Wellington Fagundes para retirar reportagens sobre benefícios fiscais atribuídos a empresas ligadas à família dele. A defesa contesta parte dos valores, e o direito de resposta ainda será julgado.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral · governo · 2/10")],
    [1, linha(480, "Juiz auxiliar da propaganda · TRE-MT", "Liminar negada: as reportagens seguem no ar por enquanto", "Pedido de Wellington Fagundes (PL) e da coligação Coração da Gente; para o juiz, não havia urgência para retirar o conteúdo jornalístico antes de ouvir o veículo")],
    [2, linha(900, "Posição da defesa", "Contesta R$ 919,9 mil atribuídos a uma empresa com a mesma sigla", "O juiz registrou que manter as publicações não significa reconhecer as informações como verdadeiras") + `<div class="p" style="top:1300px"><span class="pill" style="font-size:36px">Direito de resposta ainda será julgado</span></div>` + nota(1420, "Fontes: RDM Online (2/10) e VGN (3/10).")],
  ],
  quando: [null, "negou a liminar", "A defesa contesta"],
});

for (const [i, c] of cenas.entries())
  for (const q of c.quando)
    if (q && !c.fala.toLowerCase().includes(q.toLowerCase()))
      throw new Error(`cena ${i + 2}: trecho "${q}" não está na fala`);

// ------------------------------------------------------------ render
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const roteiro = [];
for (const [i, c] of cenas.entries()) {
  const n = i + 1;
  const arq = (suf) => `${PREFIXO}-${n}-${suf}.png`;
  await page.setContent(
    `<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 13 + 5)}</body></html>`
  );
  await page.screenshot({ path: join(OUT, arq("fundo")) });
  const camadas = [...new Set(c.pecas.map(([k]) => k))].sort((a, b) => a - b);
  const lista = [];
  for (const k of camadas) {
    const html = c.pecas
      .filter(([kk]) => kk === k)
      .map(([, h]) => h)
      .join("");
    await page.setContent(
      `<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(OUT, arq(`c${k}`)), omitBackground: true });
    lista.push({
      imagem: `${PASTA}/cenas/${arq(`c${k}`)}`,
      ...(c.quando[k] ? { quando: c.quando[k] } : { em: 0 }),
    });
  }
  await page.setContent(
    `<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 13 + 5)}${c.pecas.map(([, h]) => h).join("")}</body></html>`
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(PREVIA, `${n}.png`) });
  roteiro.push({
    n: n + 1,
    quem: "narrador",
    fala: c.fala,
    imagem: `${PASTA}/cenas/${arq("fundo")}`,
    movimento: c.movimento,
    camadas: lista,
  });
}
await browser.close();
writeFileSync(join(SCRATCH, "b8-cenas.json"), JSON.stringify(roteiro, null, 1));
const palavras = cenas.reduce((s, c) => s + c.fala.trim().split(/\s+/).length, 0);
console.log(
  `${cenas.length} cenas, ${palavras} palavras de fala (sem intro e fechamento); roteiro parcial em ${join(SCRATCH, "b8-cenas.json")}; prévias em ${PREVIA}`
);
