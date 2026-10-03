/* global document */
// Slides (1080×1920) do boletim em vídeo nº 7 — formato "só voz e slides"
// (editor, 29/09), sem música, com intro e fechamento padrão (editor, 01 e 02/10).
// Tema: véspera do 1º turno (sábado, 3/10): o eleitorado e o horário de votação
// (TRE-MT), o último dia de campanha dos candidatos ao governo e as duas decisões
// do TRE-MT de 2/10 na disputa pelo Senado que entraram no Radar depois do
// boletim nº 6 (02/10, 17:52 MT): multa de R$ 100 mil por nova publicação a Zé
// Medeiros (pedido de Janaina Riva) e a negativa da liminar de Medeiros contra a
// pesquisa Percent MT-09025/2026.
// Dados: content/paginas/radar-dados.json; o script confere os casos antes de desenhar.
// A intro (cena 1) sai do intro-boletim.mjs e o fechamento (última cena) do
// fechamento-boletim.mjs; aqui ficam as cenas 2 a 5 (arquivos <prefixo>-1… a -4…).
// Regras: casos judiciais sem repetir o conteúdo das propagandas; tratamento igual;
// listas de candidatos em ordem alfabética.
// Uso: node graficos-boletim-07.mjs
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { SCRATCH, esc, fundo, CSS } from "./slides-lib.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const PASTA = "pautas/videos/argos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-10-03-boletim-07";
const PREVIA = join(SCRATCH, "b7-previa");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

// ------------------------------------------------------------ confere no Radar
const radar = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8"));
const erros = [];
const itens = (nome) => radar.justica.candidatos.find((c) => c.nome === nome)?.itens || [];
const multa = itens("Zé Medeiros").find(
  (i) => i.data === "2026-10-02" && /R\$ 100 mil/.test(i.resumo) && /paulosouza/.test(i.resumo)
);
const multaJ = itens("Janaina Riva").find(
  (i) => i.data === "2026-10-02" && /R\$ 100 mil/.test(i.resumo) && /paulosouza/.test(i.resumo)
);
if (
  !multa ||
  multa.papel !== "contra" ||
  !multaJ ||
  multaJ.papel !== "pedido" ||
  multa.cabe_recurso !== true
)
  erros.push("multa de R$ 100 mil a Medeiros (2/10, pedido de Janaina) não confere com o Radar");
const percent = itens("Zé Medeiros").find(
  (i) => i.data === "2026-10-02" && /MT-09025/.test(i.resumo) && /negou a tutela/.test(i.resumo)
);
if (!percent || percent.papel !== "pedido")
  erros.push("negativa da liminar contra a pesquisa Percent (2/10) não confere com o Radar");
const sen = radar.pesquisas.corridas.find((c) => c.id === "senado-mt");
if (!sen.pesquisas.some((q) => /MT-09025/.test(q.reg)))
  erros.push("a pesquisa Percent MT-09025 não está mais na corrida do Senado");
if (erros.length)
  throw new Error("o Radar mudou; ajuste a fala e o slide:\n- " + erros.join("\n- "));

// ------------------------------------------------------------ peças
const CAB = `<div class="p cab">RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>`;
const chip = (t, topo = 330) =>
  `<div class="p" style="top:${topo}px"><span class="chip">${esc(t)}</span></div>`;
const tit = (html, topo = 470) => `<div class="p tit" style="top:${topo}px">${html}</div>`;
const nota = (topo, texto) =>
  `<div class="p ficha" style="top:${topo}px;font-size:27px">${esc(texto)}</div>`;
const linha = (topo, rotulo, texto, detalhe) =>
  `<div class="p card" style="top:${topo}px;padding:30px 40px"><h3 style="font-size:28px;height:44px;line-height:44px">${esc(rotulo)}</h3><div class="sub" style="font-size:38px;color:#fff;font-weight:700">${esc(texto)}</div><div class="ficha" style="margin-top:10px">${esc(detalhe)}</div></div>`;

const grande = (topo, numero, rotulo) =>
  `<div class="p" style="top:${topo}px;text-align:center"><div style="font-size:150px;font-weight:800;color:#fff;line-height:1">${esc(numero)}</div><div class="sub" style="font-size:44px;margin-top:16px">${esc(rotulo)}</div></div>`;

const cenas = [];

// 1 — a notícia principal: amanhã, 2,6 milhões de eleitores vão às urnas (dados do TRE-MT)
cenas.push({
  fala: "Mato Grosso vai às urnas neste domingo com dois milhões, seiscentos e trinta e oito mil eleitores aptos, em cento e quarenta e dois municípios. A votação vai das sete às dezesseis horas, no horário de Mato Grosso.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("1º turno · domingo, 4/10") + tit("Mato Grosso<br>vai às <b>urnas</b>", 470)],
    [1, grande(820, "2.638.230", "eleitores aptos a votar")],
    [
      2,
      linha(
        1130,
        "TRE-MT · planejamento do 1º turno",
        "142 municípios · 1.519 locais · 8.287 seções",
        "57 zonas eleitorais"
      ),
    ],
    [
      3,
      `<div class="p" style="top:1450px"><span class="pill" style="font-size:40px">Votação das 7h às 16h (horário de MT)</span></div>` +
        nota(1580, "Fontes: TRE-MT, O Documento e MidiaJur, 2/10."),
    ],
  ],
  quando: [null, "dois milhões", "cento e quarenta e dois", "das sete às dezesseis"],
});

// 2 — último dia de campanha (ordem alfabética; agendas divulgadas pelas campanhas)
cenas.push({
  fala: "Hoje é o último dia de campanha. Pelas agendas divulgadas, Doutora Natasha faz atos em Rondonópolis e Cuiabá; Otaviano Pivetta, caminhada em Várzea Grande; e Wellington Fagundes, caminhada em Rondonópolis e carreata em Cuiabá.",
  movimento: "pan-dir",
  pecas: [
    [0, CAB + chip("Sábado, 3/10 · último dia de campanha")],
    [
      1,
      linha(
        470,
        "Doutora Natasha (PSD)",
        "Mobilização em Rondonópolis e carreata em Cuiabá",
        "9h no antigo aeroporto de Rondonópolis · 15h, Carreata da Virada, Av. Emanuel Pinheiro"
      ),
    ],
    [
      2,
      linha(
        830,
        "Otaviano Pivetta (Republicanos)",
        "Caminhada em Várzea Grande",
        "Concentração às 8h na Praça da Todimo, com a prefeita Flávia Moretti"
      ),
    ],
    [
      3,
      linha(
        1150,
        "Wellington Fagundes (PL)",
        "Caminhada em Rondonópolis e carreata em Cuiabá",
        "7h30 na Praça Bom Jesus (Vila Operária) · 15h na Praça das Bandeiras, com a deputada Coronel Fernanda"
      ) +
        nota(
          1510,
          "Agendas divulgadas pelas campanhas, segundo MidiaJur e Repórter MT (3/10). As matérias não trazem as agendas de Maurício Coelho, Rafaell Milas e Sargento Laudicério."
        ),
    ],
  ],
  quando: [
    null,
    "Doutora Natasha faz",
    "Otaviano Pivetta, caminhada",
    "Wellington Fagundes, caminhada",
  ],
});

// 3 — Justiça Eleitoral, Senado: multa por nova publicação (sem repetir o conteúdo do vídeo)
cenas.push({
  fala: "Na Justiça Eleitoral, a pedido de Janaina Riva, um juiz auxiliar do TRE mandou retirar um vídeo compartilhado por Zé Medeiros e elevou para cem mil reais a multa em caso de nova publicação com conteúdo já proibido. A decisão é liminar e cabe recurso.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral · Senado · 2/10")],
    [
      1,
      linha(
        480,
        "Juiz auxiliar da propaganda · TRE-MT · 2/10",
        "Retirada de vídeo compartilhado por Zé Medeiros (PL)",
        "Pedido de Janaina Riva (MDB) · o juiz viu repetição de conteúdo já proibido em quatro decisões anteriores"
      ),
    ],
    [
      2,
      linha(
        840,
        "Nova publicação com conteúdo proibido",
        "Multa de R$ 100 mil por publicação",
        "Nova repetição pode levar à suspensão temporária dos perfis"
      ),
    ],
    [
      3,
      `<div class="p" style="top:1200px"><span class="pill" style="font-size:38px">Liminar · cabe recurso</span></div>` +
        nota(
          1330,
          "Fontes: MidiaJur, Repórter MT e Folhamax, 2/10. As matérias não trazem manifestação de Zé Medeiros sobre a decisão."
        ),
    ],
  ],
  quando: [null, "mandou retirar", "cem mil reais", "cabe recurso"],
});

// 4 — Justiça Eleitoral: pesquisa Percent segue liberada
cenas.push({
  fala: "O mesmo juiz negou o pedido de Zé Medeiros para suspender a pesquisa Percent para o Senado. A divulgação segue liberada, e o mérito ainda será julgado.",
  movimento: "pan-esq",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral · pesquisas · 2/10")],
    [
      1,
      linha(
        480,
        "Juiz auxiliar da propaganda · TRE-MT · 2/10",
        "Negado o pedido para suspender a pesquisa Percent MT-09025/2026",
        "Pedido de Zé Medeiros (PL), que apontou erros no cartão de perguntas; a representação também é contra Janaina Riva (MDB)"
      ),
    ],
    [
      2,
      `<div class="p" style="top:880px"><span class="pill" style="font-size:38px">Divulgação liberada · falta o mérito</span></div>` +
        nota(
          1010,
          "Para o juiz, as falhas apontadas não comprometem a confiabilidade da pesquisa. Fontes: Folhamax e Olhar Direto, 2/10."
        ),
    ],
  ],
  quando: [null, "negou o pedido", "segue liberada"],
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
writeFileSync(join(SCRATCH, "b7-cenas.json"), JSON.stringify(roteiro, null, 1));
const palavras = cenas.reduce((s, c) => s + c.fala.trim().split(/\s+/).length, 0);
console.log(
  `${cenas.length} cenas, ${palavras} palavras de fala (sem intro e fechamento); roteiro parcial em ${join(SCRATCH, "b7-cenas.json")}; prévias em ${PREVIA}`
);
