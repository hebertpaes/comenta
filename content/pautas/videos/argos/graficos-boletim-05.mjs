// Slides (1080×1920) do boletim em vídeo nº 5 — formato "só voz e slides"
// (editor, 29/09), sem música, com intro e fechamento (editor, 01/10).
// Tema: o que mudou no Radar depois do boletim nº 4 (30/09, 07:17 MT): o STF
// e as propagandas de Doutora Natasha, as pesquisas novas para o governo e o
// Senado, a Justiça Eleitoral na disputa pelo Senado e o ato de Rondonópolis.
// Dados: content/paginas/radar-dados.json; o script confere os números e os
// casos antes de desenhar (a fala tem de bater com o slide).
// A intro (cena 1 do roteiro) sai do intro-boletim.mjs; aqui ficam as cenas
// 2 a 11 (arquivos <prefixo>-1… a <prefixo>-10…, como no nº 4).
// Mesmo visual do nº 3 e do nº 4 (slides-lib.mjs); camadas entram quando o
// narrador chega ao trecho (campo `quando`).
// Regras deste boletim: pesquisa sempre com ficha técnica no slide e todos os
// candidatos da ficha; nunca a Veritá MT-09975/2026 (suspensa); casos
// judiciais sem descrever o conteúdo das acusações nem das propagandas.
// Uso: node graficos-boletim-05.mjs
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

import { SCRATCH, esc, pct, fundo, CSS } from "./slides-lib.mjs";
const require = createRequire(join(SCRATCH, "pw", "package.json"));
const { chromium } = require("playwright-core");

const REPO = "/home/user/comenta/content";
const PASTA = "pautas/videos/argos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-10-02-boletim-05";
const PREVIA = join(SCRATCH, "b5-previa");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

// ------------------------------------------------------------ conferência dos dados
const radar = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8"));
const erros = [];
const confere = (rot, radarV, falaV) => { if (radarV !== falaV) erros.push(`${rot}: Radar ${JSON.stringify(radarV)} × fala ${JSON.stringify(falaV)}`); };

// pesquisas (as quatro que entraram no Radar depois do boletim nº 4)
const corrida = (id) => radar.pesquisas.corridas.find((c) => c.id === id);
const gov = corrida("governador-mt"), sen = corrida("senado-mt");
const achar = (c, inst, reg) => c.pesquisas.find((q) => q.inst === inst && q.reg.includes(reg));
const pGov = achar(gov, "Paraná Pesquisas", "MT-02094");
const ppGov = achar(gov, "Povo e Poder", "MT-07968");
const pSen = achar(sen, "Paraná Pesquisas", "MT-02094");
const peSen = achar(sen, "Percent Brasil", "MT-09025");
if (!pGov || !ppGov || !pSen || !peSen) throw new Error("pesquisa não encontrada no Radar (Paraná MT-02094, Povo e Poder MT-07968, Percent MT-09025)");
// pesquisa com divulgação suspensa nunca entra (Veritá, liminar do TRE-MT de 28/9)
if ([pGov, ppGov, pSen, peSen].some((q) => /MT-09975/.test(q.reg) || /verit/i.test(q.inst))) throw new Error("pesquisa suspensa (Veritá) no boletim");
confere("Paraná/governo Pivetta", pGov.v["Otaviano Pivetta"], 46.4);
confere("Paraná/governo Wellington", pGov.v["Wellington Fagundes"], 27.1);
confere("Paraná/governo Natasha", pGov.v["Doutora Natasha"], 15.5);
confere("Povo e Poder/governo Wellington", ppGov.v["Wellington Fagundes"], 31.8);
confere("Povo e Poder/governo Pivetta", ppGov.v["Otaviano Pivetta"], 30.7);
confere("Povo e Poder/governo Natasha", ppGov.v["Doutora Natasha"], 9);
confere("Povo e Poder/margem (empate técnico)", ppGov.margem, "2,83");
confere("Paraná/Senado Mauro", pSen.v["Mauro Mendes"], 37.5);
confere("Paraná/Senado Janaina", pSen.v["Janaina Riva"], 18);
confere("Paraná/Senado Medeiros", pSen.v["Zé Medeiros"], 16);
confere("Paraná/Senado margem (empate técnico)", pSen.margem, "2,7");
confere("Percent/Senado Mauro", peSen.v["Mauro Mendes"], 38.3);
confere("Percent/Senado Janaina", peSen.v["Janaina Riva"], 22.8);
confere("Percent/Senado Medeiros", peSen.v["Zé Medeiros"], 10.4);

// casos da Justiça Eleitoral (data >= 30/9) citados na fala
const itens = (nome) => radar.justica.candidatos.find((c) => c.nome === nome)?.itens || [];
const stf = itens("Doutora Natasha").find((i) => i.data === "2026-10-01" && i.orgao.startsWith("STF"));
const pleno = itens("Doutora Natasha").find((i) => i.data === "2026-09-30" && i.orgao === "TRE-MT (Pleno)");
const limMedeiros = itens("Zé Medeiros").filter((i) => i.data === "2026-09-30" && i.tipo === "decisao" && /liminar/.test(i.orgao) && /pedido de Janaina/.test(i.resumo));
const multaJanaina = itens("Janaina Riva").find((i) => i.data === "2026-09-30" && i.papel === "contra" && /Glenda Borges/.test(i.resumo) && /R\$ 5 mil/.test(i.resumo));
const aije = itens("Mauro Mendes").find((i) => i.data === "2026-09-30" && i.tipo === "acao_em_andamento" && /Taques/.test(i.resumo));
if (!stf) erros.push("caso do STF (Natasha, 1º/10) não está no Radar");
if (!pleno) erros.push("decisão do Pleno do TRE-MT (Natasha, 30/9) não está no Radar");
if (limMedeiros.length !== 2) erros.push(`liminares contra Medeiros a pedido de Janaina em 30/9: ${limMedeiros.length} (a fala diz dois vídeos)`);
if (!multaJanaina) erros.push("multa de R$ 5 mil a Janaina (30/9) não está no Radar");
if (!aije || !/não há decisão/.test(aije.resumo)) erros.push("AIJE de Taques contra Mauro sem decisão (30/9) não confere com o Radar");

// grupos: Medeiros no ato de Pivetta e Mauro pedindo votos para Medeiros (Rondonópolis, 30/9)
const movs = radar.grupos.grupos.flatMap((g) => g.movimentos || []);
const rondon = movs.find((m) => m.data === "2026-09-30" && /Rondonópolis/.test(m.fato) && /caminhada/.test(m.fato) && /pediu votos para Medeiros/.test(m.fato));
if (!rondon) erros.push("movimento de Rondonópolis (30/9) não está em grupos");
if (erros.length) throw new Error("o Radar mudou; ajuste a fala e o slide:\n- " + erros.join("\n- "));

// ------------------------------------------------------------ peças
const CAB = `<div class="p cab">RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>`;
const chip = (t, topo = 330) => `<div class="p" style="top:${topo}px"><span class="chip">${esc(t)}</span></div>`;
const tit = (html, topo = 470) => `<div class="p tit" style="top:${topo}px">${html}</div>`;
const pills = (topo, ...t) => `<div class="p" style="top:${topo}px">${t.map((x) => `<span class="pill">${esc(x)}</span>`).join("")}</div>`;
const nota = (topo, texto) => `<div class="p ficha" style="top:${topo}px;font-size:27px">${esc(texto)}</div>`;
// linha de um cartão de casos: rótulo + texto + detalhe (data, órgão, defesa)
const linha = (topo, rotulo, texto, detalhe) =>
  `<div class="p card" style="top:${topo}px;padding:30px 40px"><h3 style="font-size:28px;height:44px;line-height:44px">${esc(rotulo)}</h3><div class="sub" style="font-size:38px;color:#fff;font-weight:700">${esc(texto)}</div><div class="ficha" style="margin-top:10px">${esc(detalhe)}</div></div>`;

// barras de pesquisa (como no nº 3): todos os candidatos da ficha, em ordem de resultado
function barras(v, nomes, { max = 60, pq = true, partidos = {} } = {}) {
  return nomes.map((n) => {
    const x = v[n] ?? 0;
    return `<div class="row${pq ? " pq" : ""}"><div class="n">${esc(n)}${partidos[n] ? `<i>${esc(partidos[n])}</i>` : ""}</div><div class="v">${pct(x)}</div><div class="t"><div class="f" style="width:${Math.max(0.6, (x / max) * 100).toFixed(1)}%"></div></div></div>`;
  });
}
const ordena = (v, nomes) => [...nomes].sort((a, b) => (v[b] ?? 0) - (v[a] ?? 0) || a.localeCompare(b, "pt"));
const regCurto = (r) => r.replace(/\s*\(.*$/, "");
const contr = (q) => (q.contratante === "recursos próprios" ? "recursos próprios" : `contratada por ${q.contratante}`);
const ficha = (q, metodo, extra = "") =>
  esc(`${q.inst} · ${contr(q)} · ${q.amostra} entrevistas ${metodo} · campo de ${q.campo} · margem de ${q.margem} pontos · confiança de ${q.conf || 95}% · registro ${regCurto(q.reg)}${extra}`);

const PART = { "Otaviano Pivetta": "Republicanos", "Wellington Fagundes": "PL", "Doutora Natasha": "PSD", "Sargento Laudicério": "Agir", "Maurício Coelho": "Mobiliza", "Rafaell Milas": "Missão" };
const GOV6 = Object.keys(PART);
const PS = { "Mauro Mendes": "União", "Janaina Riva": "MDB", "Zé Medeiros": "PL", "Pedro Taques": "PSB", "Fávaro": "PSD", "Galvan": "Avante", "Margareth Buzetti": "PP", "Coronel Darwin": "Democrata", "Professor Nelson Ferreira": "Agir", "Beny Godoy": "Agir" };
const SEN10 = Object.keys(PS);

// cartão de pesquisa: barras 4… ficam no cartão (camada 0); as primeiras entram
// em camadas próprias, alinhadas pelo mesmo topo, borda e padding (`.lay`)
const TOPO = 450, ALT = 76;
const lay = (k, html) => `<div class="p lay" style="top:${TOPO}px"><div style="height:${60 + k * ALT}px"></div>${html}</div>`;
const resto = (k, html) => `<div style="position:absolute;left:44px;right:44px;top:${100 + k * ALT}px">${html}</div>`;
// cartões em fluxo dentro de um bloco no TOPO; `abaixo` reserva o espaço deles
// (invisíveis) para a peça da camada cair logo depois, sem sobrepor
const bloco = (cartoes) => `<div class="p" style="top:${TOPO}px">${cartoes}</div>`;
const abaixo = (cartoes, html) => `<div class="p" style="top:${TOPO}px"><div style="visibility:hidden">${cartoes}</div>${html}</div>`;
const pillFluxo = (t, oculto = false) => `<div style="margin-top:30px${oculto ? ";visibility:hidden" : ""}"><span class="pill" style="font-size:36px">${esc(t)}</span></div>`;

function cartaoPesquisa(q, nomesTodos, partidos, { h3, metodo, extra = "", destaques = 3, max = 60, segundo = true }) {
  const nomes = ordena(q.v, nomesTodos.filter((n) => n in q.v));
  const linhas = barras(q.v, nomes, { max, partidos });
  let cartoes = `<div class="card" style="position:relative"><h3>${esc(h3)}</h3>${resto(destaques, linhas.slice(destaques).join(""))}<div style="height:${nomes.length * ALT}px"></div><div class="ficha">${ficha(q, metodo, extra)}</div></div>`;
  if (segundo && q.t2?.length) {
    const [a, va, b, vb] = q.t2[0];
    cartoes += `<div class="card" style="margin-top:26px"><h3>2º turno simulado · votos totais</h3>${barras({ [a]: va, [b]: vb }, [a, b], { max, partidos }).join("")}</div>`;
  }
  return { nomes, linhas, cartoes };
}

const cenas = [];

// 1 — a notícia principal: o STF devolve o direito de exibir as propagandas
// (sem dizer do que tratam as peças; regra do editor)
cenas.push({
  fala: "O ministro Alexandre de Moraes, do Supremo Tribunal Federal, devolveu à candidata Doutora Natasha o direito de exibir as propagandas que o TRE de Mato Grosso tinha suspendido.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("Supremo Tribunal Federal · 1º/10") + tit("Natasha recupera<br>o direito de exibir<br><b>as propagandas</b>")],
    [1, linha(800, "Ministro Alexandre de Moraes · STF", "Reclamação de Doutora Natasha (PSD) julgada procedente", "Candidata ao governo de MT · decisão de 1º/10")],
    [2, linha(1110, "O que o ministro derrubou", "Suspensões decididas pelo TRE-MT em 28 e 29/9", "Inclusive a do programa no rádio e na TV até 1º/10")],
  ],
  quando: [null, "devolveu", "tinha suspendido"],
});

// 2 — quando saiu, o fundamento e a decisão da véspera (o outro lado no rodapé)
cenas.push({
  fala: "A decisão saiu na quinta-feira, último dia do horário eleitoral. Na véspera, o pleno do TRE manteve a suspensão.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Decisão de 1º/10") + linha(480, "Fundamento do ministro", "Entendimentos do STF sobre liberdade de expressão", "ADPF 130 e ADI 4.451")],
    [1, pills(800, "Último dia do horário eleitoral")],
    [2, linha(930, "Pleno do TRE-MT · 30/9 · por maioria", "Reclamação de Natasha rejeitada e suspensão mantida", "Relator: juiz-membro Eduardo Calmon de Almeida Cezar · a coligação de Pivetta defendeu a suspensão") +
      nota(1290, "As matérias não trazem manifestação de Otaviano Pivetta (Republicanos) ou da coligação dele sobre a decisão do STF. Elas também não informam se as propagandas voltaram ao ar nem se cabe recurso.")],
  ],
  quando: [null, "último dia", "Na véspera"],
});

// 3 — governo: Paraná Pesquisas (27 a 29/9), os seis candidatos e o 2º turno
{
  const { linhas, cartoes } = cartaoPesquisa(pGov, GOV6, PART, { h3: "1º turno · votos totais", metodo: "presenciais" });
  cenas.push({
    fala: "Para o governo, na Paraná Pesquisas, Otaviano Pivetta tem quarenta e seis vírgula quatro por cento; Wellington Fagundes, vinte e sete vírgula um; e Doutora Natasha, quinze vírgula cinco.",
    movimento: "pan-dir",
    pecas: [
      [0, CAB + chip("Governo de MT · Paraná Pesquisas") + bloco(cartoes)],
      [1, lay(0, linhas[0])],
      [2, lay(1, linhas[1])],
      [3, lay(2, linhas[2])],
    ],
    quando: [null, "Otaviano Pivetta tem", "Wellington Fagundes, vinte", "Doutora Natasha, quinze"],
  });
}

// 4 — governo: Povo e Poder (19 a 27/9), com a ressalva do Radar
// ("Pesquisa é retrato do momento" fica na cena da Percent, depois de todas as
// pesquisas, como no nº 3, e cobre também as do Senado)
{
  const ressalva = " · divulgada por release da contratante; registro não conferido pelo HOJE MT no PesqEle";
  const { linhas, cartoes } = cartaoPesquisa(ppGov, GOV6, PART, { h3: "1º turno · votos totais", metodo: "presenciais", extra: ressalva, destaques: 3 });
  // ordem da fala: Wellington, Pivetta, (empate), Natasha
  const empate = `Empate técnico · margem de ${ppGov.margem} pontos`;
  cenas.push({
    fala: "Na Povo e Poder, divulgada pela emissora contratante, Wellington tem trinta e um vírgula oito por cento, e Pivetta, trinta vírgula sete, em empate técnico. Natasha tem nove.",
    movimento: "zoom-in",
    pecas: [
      [0, CAB + chip("Governo de MT · Povo e Poder") + bloco(cartoes)],
      [1, lay(0, linhas[0])],
      [2, lay(1, linhas[1])],
      [3, abaixo(cartoes, pillFluxo(empate))],
      [4, lay(2, linhas[2])],
    ],
    quando: [null, "Wellington tem", "Pivetta, trinta", "empate técnico", "Natasha tem"],
  });
}

// 5 — Senado: Paraná Pesquisas (27 a 29/9), 1º voto, os dez candidatos
{
  const extra = ` · nenhum/branco/nulo ${pct(pSen.v["Nenhum/branco/nulo"])}, não sabe/não opinou ${pct(pSen.v["Não sabe/não opinou"])} · ${pSen.soma}`;
  const { linhas, cartoes } = cartaoPesquisa(pSen, SEN10, PS, { h3: "Duas vagas · 1º voto", metodo: "presenciais", extra, max: 50, segundo: false });
  cenas.push({
    fala: "Para o Senado, na Paraná Pesquisas, Mauro Mendes tem trinta e sete vírgula cinco por cento no primeiro voto; Janaina Riva e Zé Medeiros, dezoito e dezesseis, em empate técnico.",
    movimento: "zoom-out",
    pecas: [
      [0, CAB + chip("Senado · Paraná Pesquisas") + bloco(cartoes)],
      [1, lay(0, linhas[0])],
      [2, lay(1, linhas[1])],
      [3, lay(2, linhas[2])],
      [4, abaixo(cartoes, pillFluxo("Janaina × Medeiros: empate técnico"))],
    ],
    quando: [null, "Mauro Mendes tem", "Janaina Riva", "Zé Medeiros", "empate técnico"],
  });
}

// 6 — Senado: Percent Brasil (26 a 29/9), 1º voto, candidatos com números divulgados
// (tratamento igual: a ficha diz quem ficou sem o 1º voto divulgado nas matérias);
// fecha o bloco das pesquisas com "Pesquisa é retrato do momento"
{
  const semNumero = SEN10.filter((n) => !(n in peSen.v));
  const lista = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}` : a.join(""));
  const extra = ` · ${peSen.soma}${semNumero.length ? ` · 1º voto não divulgado nas matérias para ${lista(semNumero)}` : ""}`;
  const { linhas, cartoes } = cartaoPesquisa(peSen, SEN10, PS, { h3: "1º voto · números divulgados", metodo: "domiciliares presenciais", extra, max: 50, segundo: false });
  cenas.push({
    fala: "Na Percent Brasil, Mauro tem trinta e oito vírgula três; Janaina, vinte e dois vírgula oito; e Medeiros, dez vírgula quatro. Pesquisa é retrato do momento.",
    movimento: "pan-esq",
    pecas: [
      [0, CAB + chip("Senado · Percent Brasil") + bloco(cartoes)],
      [1, lay(0, linhas[0])],
      [2, lay(1, linhas[1])],
      [3, lay(2, linhas[2])],
      [4, abaixo(cartoes, `<div style="margin-top:30px"><span class="chip">Pesquisa é retrato do momento</span></div>`)],
    ],
    quando: [null, "Mauro tem", "Janaina, vinte", "Medeiros, dez", "retrato do momento"],
  });
}

// 7 — Justiça Eleitoral na disputa pelo Senado (30/9): partes em tratamento igual,
// sem descrever o conteúdo dos vídeos
cenas.push({
  fala: "No TRE, liminares pedidas por Janaina Riva mandaram Zé Medeiros retirar dois vídeos, e Janaina foi multada em cinco mil reais por um programa sem os nomes legíveis dos suplentes.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral · Senado")],
    [1, linha(480, "Liminares · pedido de Janaina Riva", "Zé Medeiros (PL) teve de retirar dois vídeos das redes", "Juízes auxiliares do TRE-MT · decisões provisórias, cabe recurso · as matérias não trazem manifestação de Medeiros")],
    [2, linha(850, "Multa de R$ 5 mil · cabe recurso", "Janaina Riva (MDB) e a coligação Coração da Gente", "Programa de TV de 16/9 sem os nomes dos suplentes legíveis · juíza auxiliar Glenda Borges · pedido da coligação Mato Grosso para Todos") +
      nota(1210, "Defesa de Janaina: enviou versões corrigidas às emissoras em 21/9, antes de ser notificada.")],
  ],
  quando: [null, "liminares pedidas", "Janaina foi multada"],
});

// 8 — ação em andamento (sem descrever a acusação), com o que diz Mauro
cenas.push({
  fala: "Pedro Taques entrou com ação contra Mauro Mendes, ainda sem decisão. Mauro disse que não fez nem pediu o ato questionado.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + chip("Ação em andamento") + linha(480, "TRE-MT · Corregedoria · 30/9", "Pedro Taques (PSB) × Mauro Mendes (União)", "Ação de investigação judicial eleitoral (AIJE) · distribuída ao corregedor, desembargador Marcos Machado")],
    [1, pills(830, "Não há decisão")],
    [2, `<div class="p card" style="top:970px"><h3>O que diz Mauro Mendes</h3><div class="sub" style="font-size:40px;color:#fff;font-weight:700">“Eu não posso ser responsabilizado por um ato que eu não fiz e nem pedi para fazer.”</div><div class="ficha">Declaração de 29/9 (Gazeta Digital)</div></div>`],
  ],
  quando: [null, "sem decisão", "Mauro disse"],
});

// 9 — grupos: Rondonópolis (30/9), os dois lados do mesmo movimento
cenas.push({
  fala: "Em Rondonópolis, Zé Medeiros, da coligação de Wellington, foi à caminhada de Pivetta, e Mauro Mendes, da coligação de Pivetta, pediu votos para Medeiros.",
  movimento: "pan-dir",
  pecas: [
    [0, CAB + chip("Rondonópolis · 30/9") + tit("Campanha na<br><b>reta final</b>")],
    [1, linha(720, "Coligação de Wellington Fagundes (PL)", "Zé Medeiros (PL) foi à caminhada de Otaviano Pivetta", "Com o 1º suplente, Odílio Balbinotti · Medeiros segue candidato pela coligação de Wellington")],
    [2, linha(1050, "Coligação de Otaviano Pivetta (Republicanos)", "Mauro Mendes (União) pediu votos para Medeiros", "No mesmo dia, em Rondonópolis") +
      nota(1350, "Até as 18h30 de 30/9 não havia resposta publicada de Wellington ou do PL.")],
  ],
  quando: [null, "Zé Medeiros", "Mauro Mendes"],
});

// 10 — encerramento (fala obrigatória)
cenas.push({
  fala: "Todos os casos, com as fontes, estão no Radar Eleitoral do HOJE MT.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + tit("Decisões, pesquisas<br>e fichas técnicas,<br>com as fontes", 560)],
    [1, `<div class="p" style="top:1060px"><span class="chip" style="font-size:40px;text-transform:none">hojemt.com.br/radar-eleitoral</span></div>`],
  ],
  quando: [null, "Radar Eleitoral"],
});

// todo `quando` tem de estar na fala (o charge-cena.mjs também confere)
for (const [i, c] of cenas.entries())
  for (const q of c.quando) if (q && !c.fala.toLowerCase().includes(q.toLowerCase())) throw new Error(`cena ${i + 2}: trecho "${q}" não está na fala`);

// ------------------------------------------------------------ render
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const roteiro = [];
for (const [i, c] of cenas.entries()) {
  const n = i + 1;
  const arq = (suf) => `${PREFIXO}-${n}-${suf}.png`;
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 13 + 2)}</body></html>`);
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
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 13 + 2)}${c.pecas.map(([, h]) => h).join("")}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(PREVIA, `${n}.png`) });
  roteiro.push({ n: n + 1, quem: "narrador", fala: c.fala, imagem: `${PASTA}/cenas/${arq("fundo")}`, movimento: c.movimento, camadas: lista });
}
await browser.close();
writeFileSync(join(SCRATCH, "b5-cenas.json"), JSON.stringify(roteiro, null, 1));
const chars = cenas.reduce((s, c) => s + c.fala.length, 0);
const palavras = cenas.reduce((s, c) => s + c.fala.trim().split(/\s+/).length, 0);
console.log(`${cenas.length} cenas, ${palavras} palavras e ${chars} caracteres de fala (sem a intro); roteiro parcial em ${join(SCRATCH, "b5-cenas.json")}; prévias em ${PREVIA}`);
