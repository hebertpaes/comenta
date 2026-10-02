// Slides (1080×1920) do boletim em vídeo nº 4 — formato "só voz e slides"
// (editor, 29/09). Tema: a Justiça Eleitoral na última semana de campanha,
// com os casos de content/paginas/radar-dados.json (seção justica) desde 26/9.
// Mesmo visual do nº 3 (slides-lib.mjs); camadas entram quando o narrador
// chega ao trecho (campo `quando`).
// Uso: node graficos-boletim-04.mjs
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

import { SCRATCH, esc, fundo, CSS } from "./slides-lib.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const REPO = "/home/user/comenta/content";
const PASTA = "pautas/videos/argos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-09-30-boletim-04";
const PREVIA = join(SCRATCH, "b4-previa");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

// contagem dos casos desde sábado (26/9) direto do Radar, para o slide bater com a fala
const radar = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8"));
const casos = new Map();
for (const c of radar.justica.candidatos) for (const it of c.itens || []) if (it.data >= "2026-09-26") casos.set(it.data + it.resumo, it.tipo);
const conta = (t) => [...casos.values()].filter((x) => x === t).length;
const N = { total: casos.size, decisao: conta("decisao"), arquivada: conta("arquivada"), andamento: conta("acao_em_andamento") };
if (N.total !== 17 || N.decisao !== 9 || N.arquivada !== 6 || N.andamento !== 2) throw new Error("a contagem do Radar mudou; ajuste a fala da cena 4: " + JSON.stringify(N));
const deferidos = radar.justica.candidatos.filter((c) => c.registro?.situacao === "deferido").length;
if (deferidos !== 16) throw new Error(`registros deferidos: ${deferidos} (a fala da cena 9 diz dezesseis)`);

const CAB = `<div class="p cab">RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>`;
const chip = (t, topo = 330) => `<div class="p" style="top:${topo}px"><span class="chip">${esc(t)}</span></div>`;
const tit = (html, topo = 470) => `<div class="p tit" style="top:${topo}px">${html}</div>`;
const pills = (topo, ...t) => `<div class="p" style="top:${topo}px">${t.map((x) => `<span class="pill">${esc(x)}</span>`).join("")}</div>`;
const nome = (n, partido) => `<div class="sub" style="font-size:50px;font-weight:800;color:#fff">${esc(n)} <span style="color:#9fb8ad;font-size:32px;font-weight:600">${esc(partido)}</span></div>`;
// linha de um cartão de casos: rótulo (decisão contra/a favor/pedido) + texto
const linha = (topo, rotulo, texto, data) =>
  `<div class="p card" style="top:${topo}px;padding:30px 40px"><h3 style="font-size:28px;height:44px;line-height:44px">${esc(rotulo)}</h3><div class="sub" style="font-size:38px;color:#fff;font-weight:700">${esc(texto)}</div><div class="ficha" style="margin-top:10px">${esc(data)}</div></div>`;

const cenas = [];

// 1 — a notícia principal
cenas.push({
  fala: "A Justiça Eleitoral suspendeu a propaganda de Doutora Natasha no rádio e na televisão até quinta-feira, primeiro de outubro, último dia do horário eleitoral.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("Corregedoria do TRE-MT") + tit("Propaganda de<br>Doutora Natasha<br><b>suspensa</b>")],
    [1, pills(860, "Rádio e TV", "Até quinta, 1º/10")],
    [2, pills(980, "Último dia do horário eleitoral")],
  ],
  quando: [null, "no rádio e na televisão", "último dia"],
});

// 2 — quem pediu e o que diz a decisão
cenas.push({
  fala: "O corregedor atendeu a coligação de Otaviano Pivetta, entendeu que uma ordem anterior foi descumprida e fixou multa de cem mil reais para um novo descumprimento.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Decisão de 29/9")],
    [1, linha(480, "Pedido", "Coligação de Otaviano Pivetta (Republicanos)", "Corregedor Marcos Machado · TRE-MT")],
    [2, linha(760, "Motivo", "Ordem anterior descumprida", "19 exibições em 13 emissoras, segundo a coligação")],
    [3, `<div class="p" style="top:1060px"><div class="grande" style="font-size:150px">R$ 100 mil</div><div class="sub">multa por novo descumprimento · cabe recurso</div></div>`],
  ],
  quando: [null, "coligação de Otaviano", "ordem anterior", "cem mil reais"],
});

// 3 — o outro lado
cenas.push({
  fala: "Natasha chama as restrições de censura e recorreu com um mandado de segurança. A defesa diz que as primeiras exibições foram antes da notificação.",
  movimento: "pan-dir",
  pecas: [
    [0, CAB + chip("O outro lado") + `<div class="p card" style="top:480px">${nome("Doutora Natasha", "PSD")}</div>`],
    [1, pills(760, "“Censura”, diz a candidata")],
    [2, pills(880, "Mandado de segurança")],
    [3, pills(1000, "Exibições antes da notificação, segundo a defesa")],
  ],
  quando: [null, "censura", "mandado de segurança", "A defesa"],
});

// 4 — o agregado da semana
cenas.push({
  fala: "Desde sábado, o Radar do HOJE MT reuniu dezessete casos com candidatos ao governo e ao Senado: nove decisões, seis improcedentes ou arquivados e duas ações em andamento.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral · desde 26/9") + `<div class="p" style="top:470px"><div class="grande">${N.total}</div><div class="sub">casos com candidatos ao governo e ao Senado de MT</div></div>`],
    [1, pills(980, `${N.decisao} decisões`)],
    [2, pills(1100, `${N.arquivada} improcedentes ou arquivados`)],
    [3, pills(1220, `${N.andamento} ações em andamento`)],
  ],
  quando: [null, "nove decisões", "seis improcedentes", "duas ações"],
});

// 5 — governo: Pivetta, contra e a favor
cenas.push({
  fala: "Pivetta teve de suspender o impulsionamento pago de um vídeo sobre uma emenda de Wellington Fagundes. E a Justiça julgou improcedentes duas representações da coligação de Wellington contra ele.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Governo de MT") + `<div class="p card" style="top:480px">${nome("Otaviano Pivetta", "Republicanos")}</div>`],
    [1, linha(720, "Decisão contra · liminar, 27/9", "Impulsionamento pago de vídeo suspenso", "Pedido da coligação de Wellington Fagundes (PL)")],
    [2, linha(1010, "Julgadas improcedentes · 26 e 27/9", "Duas representações da coligação de Wellington", "Inserção com prefeitos e financiamento do Fundes")],
  ],
  quando: [null, "impulsionamento", "julgou improcedentes"],
});

// 6 — Senado: Janaina (ordem alfabética no Senado: Janaina, Mauro, Zé Medeiros)
cenas.push({
  fala: "No Senado, Janaina Riva teve de parar de usar um perfil de músicas não informado à Justiça Eleitoral. A pedido da coligação dela, foi multada a responsável por perfis que atribuíram a Janaina falas falsas ou fora de contexto.",
  movimento: "pan-esq",
  pecas: [
    [0, CAB + chip("Senado") + `<div class="p card" style="top:480px">${nome("Janaina Riva", "MDB")}</div>`],
    [1, linha(720, "Decisão contra · liminar, 27/9", "Perfil no Spotify não informado à Justiça", "Pedido de Zé Medeiros (PL) · multa de R$ 2 mil por dia")],
    [2, linha(1010, "A pedido da coligação dela · 28/9", "Multa de R$ 5 mil por falas falsas ou fora de contexto", "Responsável por perfis de uma pizzaria de Juara")],
  ],
  quando: [null, "perfil de músicas", "A pedido da coligação"],
});

// 7 — Senado: Mauro e Taques
cenas.push({
  fala: "Mauro Mendes teve anúncios pagos suspensos, também a pedido de Wellington, e cinco sites tiveram de retirar publicações sobre ele. O pleno do TRE manteve improcedente uma representação da coligação de Mauro contra Pedro Taques.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("Senado") + `<div class="p card" style="top:480px">${nome("Mauro Mendes", "União")}</div>`],
    [1, linha(720, "Decisão contra · liminar, 28/9", "Quatro anúncios pagos suspensos", "Pedido da coligação de Wellington Fagundes")],
    [2, linha(1010, "Decisão a favor · 29/9", "Cinco sites retiram 11 publicações", "Multa de R$ 5 mil para cada um")],
    [3, linha(1300, "Pleno do TRE-MT · 4 a 2 · 29/9", "Representação contra Pedro Taques (PSB) segue improcedente", "Recurso da coligação de Mauro rejeitado")],
  ],
  quando: [null, "anúncios pagos", "cinco sites", "O pleno"],
});

// 8 — Senado: Zé Medeiros
cenas.push({
  fala: "Zé Medeiros foi multado em cinco mil reais por vídeos sem os nomes dos suplentes de forma legível. E a Justiça negou o pedido do Ministério Público contra o uso da imagem de Jair Bolsonaro por ele.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Senado") + `<div class="p card" style="top:480px">${nome("Zé Medeiros", "PL")}</div>`],
    [1, linha(720, "Decisão contra · 26/9", "Multa de R$ 5 mil", "Vídeos sem os nomes dos suplentes de forma legível · cabe recurso")],
    [2, linha(1010, "Pedido negado · 28/9", "Imagem de Jair Bolsonaro na propaganda", "Pedido do Ministério Público Eleitoral")],
  ],
  quando: [null, "multado", "negou o pedido"],
});

// 9 — registros e data da eleição
cenas.push({
  fala: "Os dezesseis candidatos ao governo e ao Senado estão com registro deferido; em alguns casos, ainda cabe recurso. A eleição é no domingo, quatro de outubro.",
  movimento: "pan-dir",
  pecas: [
    [0, CAB + chip("Registros de candidatura") + `<div class="p" style="top:470px"><div class="grande">${deferidos}</div><div class="sub">candidatos ao governo e ao Senado com registro deferido</div></div>`],
    [1, pills(980, "Em alguns casos, cabe recurso")],
    [2, tit("Eleição:<br><b>domingo, 4/10</b>", 1120)],
  ],
  quando: [null, "cabe recurso", "A eleição"],
});

// 10 — encerramento (fala obrigatória)
cenas.push({
  fala: "Todos os casos, com as fontes, estão no Radar Eleitoral do HOJE MT.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + tit("Decisões, ações<br>e registros, com<br>as fontes", 560)],
    [1, `<div class="p" style="top:1060px"><span class="chip" style="font-size:40px;text-transform:none">hojemt.com.br/radar-eleitoral</span></div>`],
  ],
  quando: [null, "Radar Eleitoral"],
});

// ------------------------------------------------------------ render
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const roteiro = [];
for (const [i, c] of cenas.entries()) {
  const n = i + 1;
  const arq = (suf) => `${PREFIXO}-${n}-${suf}.png`;
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 11 + 5)}</body></html>`);
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
  // prévia com tudo junto (conferência; fica no scratchpad)
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 11 + 5)}${c.pecas.map(([, h]) => h).join("")}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(PREVIA, `${n}.png`) });
  roteiro.push({ n, quem: "narrador", fala: c.fala, imagem: `${PASTA}/cenas/${arq("fundo")}`, movimento: c.movimento, camadas: lista });
}
await browser.close();
writeFileSync(join(SCRATCH, "b4-cenas.json"), JSON.stringify(roteiro, null, 1));
const chars = cenas.reduce((s, c) => s + c.fala.length, 0);
console.log(`${cenas.length} cenas, ${chars} caracteres de fala; casos ${JSON.stringify(N)}; roteiro parcial em ${join(SCRATCH, "b4-cenas.json")}`);
