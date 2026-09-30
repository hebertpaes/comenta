// Reel próprio (1080×1920, só voz e slides) sobre a sessão do TCE-MT de 29/09:
// pedido do editor em 30/09 ("Crie a própria", depois de mandar o reel do
// @ehfonte). Fatos e aspas da matéria em rascunho
// tce-mt-conselheiros-admitem-falta-em-protesto-e-sessao-tem-bate-boca; cada
// aspa na tela saiu igual em pelo menos dois veículos (crédito embaixo). Sem
// frame da TV Contas nem de terceiros; a única imagem é a ilustração própria
// (gerada com IA, sem rostos), com crédito na tela.
// Uso: node pautas/videos/graficos-tce-sessao.mjs  → cenas PNG + .cena.json
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

import { SCRATCH, esc, fundo, CSS, b64, tarjaManchete } from "./argos/slides-lib.mjs";
const require = createRequire(join(SCRATCH, "pw", "package.json"));
const { chromium } = require("playwright-core");

const REPO = "/home/user/comenta/content";
const PASTA = "pautas/videos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-09-30-tce-sessao";
const PREVIA = join(SCRATCH, "tce-previa");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

const CAB = `<div class="p cab">HOJE MT · TRIBUNAL DE CONTAS DE MT</div>`;
const chip = (t, topo = 330) => `<div class="p" style="top:${topo}px"><span class="chip">${esc(t)}</span></div>`;
const tit = (html, topo = 470) => `<div class="p tit" style="top:${topo}px">${html}</div>`;
const pills = (topo, ...t) => `<div class="p" style="top:${topo}px">${t.map((x) => `<span class="pill">${esc(x)}</span>`).join("")}</div>`;
const linha = (topo, rotulo, texto, ficha = "") =>
  `<div class="p card" style="top:${topo}px;padding:30px 40px"><h3 style="font-size:28px;height:44px;line-height:44px">${esc(rotulo)}</h3><div class="sub" style="font-size:38px;color:#fff;font-weight:700">${esc(texto)}</div>${ficha ? `<div class="ficha" style="margin-top:10px">${esc(ficha)}</div>` : ""}</div>`;
// aspa na tarja + quem disse e onde saiu (a tarja da lib não tem crédito)
const aspa = (texto, credito, topo) =>
  tarjaManchete(texto, { topo }) + `<div class="p ficha" style="top:${topo + 150 + Math.ceil(texto.length / 30) * 71}px;font-size:28px;color:#cfe9dd">${esc(credito)}</div>`;
const ILUSTRA = join(REPO, "pautas/ilustracoes/2026-09-29-tce-sessao-bate-boca.jpg");
const ilustracao = (topo) =>
  `<div class="p" style="top:${topo}px"><img src="data:image/jpeg;base64,${b64(ILUSTRA)}" style="width:100%;border-radius:28px;border:3px solid #2EDC8A;box-shadow:0 0 40px rgba(46,220,138,.45);display:block"><div class="ficha" style="font-size:26px">Ilustração: HOJE MT · gerada com IA · cena de ficção</div></div>`;

const cenas = [];

// 1 — abertura da notícia
cenas.push({
  fala: "Uma semana depois da sessão que não foi aberta por falta de quórum, o Tribunal de Contas de Mato Grosso voltou a se reunir na terça-feira, vinte e nove, e a crise interna chegou ao plenário.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("Sessão de 29/9") + tit("A crise do TCE-MT<br>chegou ao <b>plenário</b>")],
    [1, ilustracao(760)],
  ],
  quando: [null, "voltou a se reunir"],
});

// 2 — como começou
cenas.push({
  fala: "A crise começou em vinte e um de setembro, quando o presidente, Sérgio Ricardo, tirou o conselheiro Waldir Teis da supervisão da Escola Superior de Contas e assumiu a função. No dia seguinte, quatro conselheiros faltaram à sessão.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Como começou")],
    [1, linha(480, "21/9", "Sérgio Ricardo tira Waldir Teis da supervisão da Escola de Contas e assume a função", "Atos sem motivo declarado")],
    [2, linha(860, "22/9", "Antonio Joaquim, Guilherme Maluf, Alisson Alencar e Teis faltam; a sessão não é aberta")],
  ],
  quando: [null, "vinte e um de setembro", "No dia seguinte"],
});

// 3 — desagravo e proposta
cenas.push({
  fala: "Na terça, Antonio Joaquim leu um desagravo em nome dos quatro e disse que a ausência foi um protesto. Eles também propõem mudar o regimento, para que o supervisor da Escola e o ouvidor-geral sejam eleitos pelo plenário.",
  movimento: "pan-dir",
  pecas: [
    [0, CAB + chip("Desagravo")],
    [1, aspa("Nós não viemos, está escrito aqui, protesto contra a atitude de Vossa Excelência", "Antonio Joaquim · segundo Olhar Direto e Infoverus", 470)],
    [2, linha(1150, "Proposta dos quatro", "Supervisor da Escola e ouvidor-geral eleitos pelo plenário, com mandato de dois anos", "Ainda depende de análise técnica e de votação")],
  ],
  quando: [null, "protesto", "mudar o regimento"],
});

// 4 — o presidente responde
cenas.push({
  fala: "O presidente disse que os colegas desrespeitaram a população de Mato Grosso.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("O presidente")],
    [1, aspa("Eu acho que vocês deram um tiro no pé. Vocês desrespeitaram o povo de Mato Grosso", "Sérgio Ricardo · segundo Olhar Direto, Infoverus e Sorriso News", 520)],
  ],
  quando: [null, "desrespeitaram"],
});

// 5 — desconto, despesas e troca de acusações
cenas.push({
  fala: "Joaquim pediu o desconto de um dia de salário pela falta. Sérgio Ricardo respondeu que não bastava e cobrou as despesas dos prefeitos que tinham ido à sessão. Depois, os dois trocaram acusações e se chamaram de mentirosos.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Bate-boca")],
    [1, linha(480, "Antonio Joaquim", "Pede desconto de um dia de salário pela falta (1/30 do vencimento)")],
    [2, aspa("Eu quero que vocês paguem as despesas dos prefeitos que vieram aqui. Não é só descontar", "Sérgio Ricardo · segundo Olhar Direto e Infoverus", 760)],
    [3, pills(1400, "Os dois trocam acusações")],
  ],
  quando: [null, "desconto", "não bastava", "trocaram acusações"],
});

// 6 — a justificativa sobre Teis
cenas.push({
  fala: "Sobre Teis, o presidente negou motivação política. Disse que o colega estava sobrecarregado, dividia o tempo entre Mato Grosso e Santa Catarina e não apresentou trabalho na Comissão de Segurança do tribunal.",
  movimento: "pan-esq",
  pecas: [
    [0, CAB + chip("A justificativa")],
    [1, pills(470, "Nega motivação política")],
    [2, pills(590, "“Sobrecarregado”", "Mato Grosso e Santa Catarina")],
    [3, aspa("Qual foi o vosso trabalho na Comissão de Segurança? Nenhum", "Sérgio Ricardo · segundo Gazeta Digital, Fatos de Mato Grosso e Folhamax", 800)],
  ],
  quando: [null, "motivação política", "Santa Catarina", "Comissão de Segurança"],
});

// 7 — a resposta de Teis
cenas.push({
  fala: "Teis respondeu que trabalhou na Escola e na comissão, apesar das limitações de orçamento. Admitiu a falta e fez um apelo aos colegas.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("O outro lado")],
    [1, pills(470, "Trabalhou na Escola e na comissão", "Orçamento limitado")],
    [2, aspa("Vale a pena nós, sete conselheiros, discutir, brigar, degladiar por coisas tão vazias?", "Waldir Teis · segundo Gazeta Digital e Sorriso News", 760)],
  ],
  quando: [null, "trabalhou na Escola", "apelo"],
});

// 8 — "embaixador da paz"
cenas.push({
  fala: "Depois do apelo, Sérgio Ricardo nomeou Teis, em tom de ironia, embaixador da paz.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Em tom de ironia")],
    [1, aspa("Lhe nomeio o embaixador da paz", "Sérgio Ricardo · segundo Olhar Direto e Gazeta Digital", 560)],
  ],
  quando: [null, "embaixador"],
});

// 9 — e agora
cenas.push({
  fala: "A proposta de mudar o regimento ainda passa por análise técnica antes de ir a votação. As falas foram publicadas por veículos que acompanharam a sessão.",
  movimento: "pan-dir",
  pecas: [
    [0, CAB + chip("E agora")],
    [1, linha(480, "Regimento", "Análise técnica, depois votação no plenário", "Proposta assinada por Joaquim, Alencar, Maluf e Teis")],
    [2, linha(820, "Fontes", "Falas publicadas por veículos que acompanharam a sessão", "Olhar Direto, Folhamax, Gazeta Digital, Fatos de MT, Infoverus, Sorriso News")],
  ],
  quando: [null, "análise técnica", "As falas"],
});

// 10 — encerramento
cenas.push({
  fala: "A matéria completa, com as fontes, está no HOJE MT.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + tit("Crise no TCE-MT:<br>a matéria completa,<br>com as fontes", 560)],
    [1, `<div class="p" style="top:1060px"><span class="chip" style="font-size:40px;text-transform:none">hojemt.com.br · link na bio</span></div>`],
  ],
  quando: [null, "HOJE MT"],
});

// ------------------------------------------------------------ render
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const roteiro = [];
for (const [i, c] of cenas.entries()) {
  const n = i + 1;
  const arq = (suf) => `${PREFIXO}-${n}-${suf}.png`;
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 13 + 7)}</body></html>`);
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
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 13 + 7)}${c.pecas.map(([, h]) => h).join("")}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(PREVIA, `${n}.png`) });
  roteiro.push({ n, quem: "narrador", fala: c.fala, imagem: `${PASTA}/cenas/${arq("fundo")}`, movimento: c.movimento, camadas: lista });
}
await browser.close();

const fontes = ["Olhar Direto", "Folhamax", "Gazeta Digital", "Fatos de Mato Grosso", "HiperNotícias", "Infoverus", "O Livre", "Sorriso News", "Eh Fonte"];
const spec = {
  slug: "tce-sessao-29-09",
  titulo: "Crise no TCE-MT: a sessão de 29/09",
  materia: "https://hojemt.com.br/tce-mt-conselheiros-admitem-falta-em-protesto-e-sessao-tem-bate-boca/",
  estilo: "slides",
  universo: "Slides escuros com ondas e curvas de nível verdes (mesmo visual dos boletins), sem avatar; ilustração própria da matéria na cena 1",
  obs: "Reel próprio pedido pelo editor em 30/09 (\"Crie a própria\"), depois do reel do @ehfonte (Dd45uMmg0yr), usado só como pista. Base: rascunho tce-mt-conselheiros-admitem-falta-em-protesto-e-sessao-tem-bate-boca (id 6abc3e4d834d62060cb1de1e). Cada aspa na tela tem crédito e saiu igual em pelo menos dois veículos; as falas ainda não foram conferidas na gravação oficial (YouTube aTo4U6AIDDs bloqueado daqui), a mesma trava da matéria. Os dois lados: justificativa do presidente e resposta de Teis. Sem frame da TV Contas nem de terceiros. Voz sintética genérica (narrador), nunca de pessoa real.",
  voz: {
    motor: "edge", narrador: "pt-BR-AntonioNeural", personagem: null, velocidade: "+18%", tom: "+4Hz",
    reserva: { motor: "kokoro", narrador: "pm_alex", velocidade: 1.18, tom: 2, tratamento: "limpo", fonetica: "misaki", sotaque: "cuiabano" },
  },
  legendas: false,
  trilha: { id: "pantanal" },
  abertura: { chip: "TCE-MT", gancho: "A CRISE CHEGOU AO PLENÁRIO", sub: "Tribunal de Contas · 29/09" },
  cenas: roteiro,
  fechamento: {
    linha1: "HOJE MT · hojemt.com.br",
    leia: "hojemt.com.br · link na bio",
    leia_rotulo: "Leia a matéria:",
    fontes,
    aviso: "Voz gerada com IA (narrador sintético) e ilustração gerada com IA (cena de ficção). Falas publicadas por veículos que acompanharam a sessão; fatos conferidos pela redação do HOJE MT.",
  },
  saida: `${PASTA}/${PREFIXO}.mp4`,
  rotulo_ia: "Voz e ilustração geradas com IA",
};
writeFileSync(join(REPO, PASTA, `${PREFIXO}.cena.json`), JSON.stringify(spec, null, 1) + "\n");
const chars = cenas.reduce((s, c) => s + c.fala.length, 0);
console.log(`${cenas.length} cenas, ${chars} caracteres de fala → ${PASTA}/${PREFIXO}.cena.json; prévias em ${PREVIA}`);
