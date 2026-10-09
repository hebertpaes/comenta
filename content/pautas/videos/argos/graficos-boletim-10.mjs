/* global document */
// Slides (1080×1920) do boletim em vídeo nº 10 — boletim diário aprofundado do
// 2º turno (formato pedido pelo editor em 08/10/2026; mesmo molde do nº 9: só voz
// e slides, sem música, intro e fechamento padrão, voz v8 com Antonio e Thalita
// alternando por bloco temático, nunca por candidato).
// Tema: os passos de Flávio Bolsonaro (PL) e de Lula (PT) de 08 a 09/10, o começo
// da propaganda gratuita, as pesquisas registradas Datafolha (BR-02949/2026) e Vox
// Brasil (BR-09623/2026), decisões do TSE e Mato Grosso.
// Apuração: agente de 09/10 (cada fato com fonte oficial ou dois veículos; o que
// tinha fonte única ficou fora ou vai atribuído), resultado oficial do TSE
// (apuração do site) e posts só de perfis oficiais (YouTube @flaviobolsonaro e
// @LulaOficial; miniatura e título, sem vídeo: o YouTube não deixa baixar daqui —
// por isso este boletim não tem clipe, para nenhum dos dois).
// Fora do vídeo por regra: as peças de ataque de uma campanha contra a outra
// (inclusive as que o TSE mandou remover) não são reproduzidas como imagem.
// A intro (cena 1) sai do intro-boletim.mjs e o fechamento (última cena) do
// fechamento-boletim.mjs; aqui ficam as cenas do meio (arquivos <prefixo>-1… em diante).
// Uso: node graficos-boletim-10.mjs
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { SCRATCH, esc, fundo, CSS, pct, cartaoPost } from "./slides-lib.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const PASTA = "pautas/videos/argos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-10-09-boletim-10";
const PREVIA = join(SCRATCH, "b10-previa");
const CACHE = join(SCRATCH, "redes-cache");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

// ------------------------------------------------------------ confere o resultado oficial (TSE via apuração do site)
const erros = [];
function leJson(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
const br = leJson(join(SCRATCH, "apuracao-br.json"));
function pctDe(j, nome) {
  if (!j) return null;
  const c = (j.cand || j.candidatos || []).find((x) => (x.nm || x.nome || "").toUpperCase().includes(nome.toUpperCase()));
  return c ? Number(String(c.pvap || c.pct || c.percentual_validos || "").replace(",", ".")) : null;
}
const esperado = { "FLÁVIO": 47.03, "LULA": 45.16 };
if (!br) erros.push(`apuracao-br.json não está em ${SCRATCH} (baixe de hojemt.com.br/content/media/apuracao/br-c0001.json)`);
else for (const [n, v] of Object.entries(esperado)) { const got = pctDe(br, n); if (got !== null && Math.abs(got - v) > 0.011) erros.push(`br ${n}: esperado ${v}, apuração ${got}`); }
if (erros.length) throw new Error("confira os números antes de montar:\n- " + erros.join("\n- "));

// ------------------------------------------------------------ posts (redes-cache; só perfis oficiais; rode redes-post.mjs com o link)
function post(id, data, credito) {
  const j = leJson(join(CACHE, `${id}.json`));
  if (!j || !j.imagem || !existsSync(j.imagem)) throw new Error(`post ${id} não está no cache de redes (rode redes-post.mjs)`);
  return { ...j, data, credito };
}
// datas no horário de Mato Grosso (o feed do YouTube dá UTC)
const pFlavioCury = post("youtube-ZxFvARHh1RM", "2026-10-08", "Reprodução: @flaviobolsonaro no YouTube, 08/10/2026");
const pFlavioLive = post("youtube-hMhVQg2D3Ro", "2026-10-08", "Reprodução: @flaviobolsonaro no YouTube, 08/10/2026");
const pLulaImprensa = post("youtube-v0D3SddWkPk", "2026-10-08", "Reprodução: @LulaOficial no YouTube, 08/10/2026");
const pLulaDF = post("youtube-50zyOUlmJ0g", "2026-10-09", "Reprodução: @LulaOficial no YouTube, 09/10/2026");

// ------------------------------------------------------------ peças
const CAB = `<div class="p cab">RADAR ELEITORAL · HOJE MT · 2º TURNO · 25/10</div>`;
const chip = (t, topo = 300) => `<div class="p" style="top:${topo}px"><span class="chip">${esc(t)}</span></div>`;
const tit = (html, topo = 430) => `<div class="p tit" style="top:${topo}px">${html}</div>`;
const nota = (topo, texto) => `<div class="p ficha" style="top:${topo}px;font-size:26px">${esc(texto)}</div>`;
const linha = (topo, rotulo, texto, detalhe, extra = "") =>
  `<div class="p card" style="top:${topo}px;padding:28px 40px;${extra}"><h3 style="font-size:27px;height:42px;line-height:42px">${esc(rotulo)}</h3><div class="sub" style="font-size:36px;color:#fff;font-weight:700">${esc(texto)}</div>${detalhe ? `<div class="ficha" style="margin-top:8px">${esc(detalhe)}</div>` : ""}</div>`;
const cardEsq = (topo, rotulo, texto, detalhe) => linha(topo, rotulo, texto, detalhe, "left:70px;right:auto;width:490px;padding:22px 28px");
const pill = (topo, t, tam = 36) => `<div class="p" style="top:${topo}px"><span class="pill" style="font-size:${tam}px">${esc(t)}</span></div>`;
// barras: lista completa como divulgada (ordem = como o instituto/TSE divulgou)
const barras = (topo, rotulo, itens, ficha, escala = 60, dest = 2) => {
  const l = itens
    .map(([n, v], k) => `<div style="display:flex;align-items:center;gap:16px;margin:${k < dest ? 10 : 4}px 0;font:${k < dest ? "700 34px" : "500 25px"} Inter;color:${k < dest ? "#fff" : "#cfe9dd"}"><span style="width:360px">${esc(n)}</span><span style="flex:1;height:${k < dest ? 26 : 12}px;position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(0.5, (v / escala) * 100)}%;background:${k === 0 ? "#2EDC8A" : "rgba(46,220,138,.55)"};border-radius:8px"></i></span><b style="width:130px;text-align:right">${esc(pct(v))}</b></div>`)
    .join("");
  return `<div class="p card" style="top:${topo}px;padding:26px 36px"><h3 style="font-size:27px;height:42px;line-height:42px">${esc(rotulo)}</h3>${l}<div class="ficha" style="margin-top:10px;font-size:22px">${esc(ficha)}</div></div>`;
};
// linha do tempo vertical (calendário)
const agenda = (topo, itens) =>
  `<div class="p card" style="top:${topo}px;padding:26px 36px"><h3 style="font-size:27px;height:42px;line-height:42px">Calendário do 2º turno</h3>` +
  itens.map(([d, t, s]) => `<div style="display:flex;gap:18px;align-items:flex-start;margin:12px 0"><span style="flex:0 0 150px;font:800 34px Inter;color:#2EDC8A">${esc(d)}</span><span style="font:700 31px/1.2 Inter;color:#fff">${esc(t)}${s ? `<small style="display:block;font:500 24px/1.25 Inter;color:#9fb8ad;margin-top:4px">${esc(s)}</small>` : ""}</span></div>`).join("") +
  `</div>`;

const cenas = [];

// ============================================================ BLOCO 1 (voz A) — panorama e calendário
cenas.push({
  voz: "A", movimento: "zoom-in",
  fala: "Faltam dezesseis dias para o segundo turno. Flávio Bolsonaro, do PL, e Lula, do PT, voltam às urnas em vinte e cinco de outubro. No primeiro turno, Flávio teve quarenta e sete vírgula zero três por cento dos votos válidos, e Lula, quarenta e cinco vírgula dezesseis. Desde o último boletim, Flávio recebeu o apoio do Podemos e de Augusto Cury. Lula voltou às ruas. E saíram duas pesquisas registradas: no Datafolha, Flávio aparece à frente; na Vox Brasil, Lula.",
  pecas: [
    [0, CAB + chip("2º turno · 25 de outubro") + tit("Flávio <b>x</b> Lula", 420)],
    [1, barras(640, "1º turno · votos válidos (TSE, 100% das seções)", [["Flávio Bolsonaro (PL)", 47.03], ["Lula (PT)", 45.16], ["Augusto Cury (Avante)", 2.89], ["Renan Santos (Missão)", 2.24], ["Ronaldo Caiado (PSD)", 2.18], ["Zema (Novo)", 0.27]], "Diferença de 2.224.965 votos (1,87 ponto); Samara, Hertz Dias, Clariana Barão e Edmilson Costa abaixo de 0,1%")],
    [2, linha(1290, "Desde o boletim nº 9 (08/10)", "Podemos e Augusto Cury com Flávio · Lula nas ruas do DF", "Pesquisas registradas: Datafolha (Flávio à frente) e Vox Brasil (Lula à frente) · detalhes e fichas mais adiante")],
  ],
  quando: [null, "quarenta e sete", "Desde o último boletim"],
});
cenas.push({
  voz: "A", movimento: "pan-dir",
  fala: "A propaganda gratuita no rádio e na televisão começa hoje e vai até o dia vinte e três. No horário de Mato Grosso, o programa dos presidenciáveis vai ao ar às seis e às onze horas no rádio, e ao meio-dia e às dezenove e trinta na televisão. Os debates previstos são na Record, no domingo, dia onze; num grupo de veículos, no dia quinze; na Band, no dia dezoito; e na Globo, no dia vinte e três. Nenhum dos dois confirmou presença num debate específico.",
  pecas: [
    [0, CAB + chip("Calendário até a votação")],
    [1, agenda(420, [["Sex 9/10", "Começa a propaganda gratuita", "Até 23/10, de segunda a sábado · em MT: rádio 6h e 11h; TV 12h e 19h30 (7h, 12h, 13h e 20h30 de Brasília) · 5 min para cada um por bloco · Jornal de Brasília, SBT News"], ["Dom 11/10", "Debate na Record (previsto)"], ["Qui 15/10", "Debate de um grupo de veículos (previsto)"], ["Dom 18/10", "Debate na Band, 20h de Brasília", "Remarcado de 11/10 · CartaCapital, Correio Braziliense"], ["Sex 23/10", "Debate na Globo (previsto) · fim da propaganda gratuita"], ["Dom 25/10", "Votação", "Em MT, das 7h às 16h, hora local"]])],
    [2, pill(1640, "Presença em debate específico: nenhum dos dois confirmou", 30)],
  ],
  quando: [null, "A propaganda gratuita", "Nenhum dos dois"],
});

// ============================================================ BLOCO 2 (voz B) — os passos de Flávio Bolsonaro
cenas.push({
  voz: "B", movimento: "zoom-out",
  fala: "Os passos de Flávio Bolsonaro. Na quinta-feira, em Brasília, o Podemos formalizou o apoio a ele. O anúncio foi feito pela presidente do partido, Renata Abreu. Depois, Flávio reuniu catorze governadores eleitos no Centro Empresarial Brasil 21. O governador de Mato Grosso, Otaviano Pivetta, estava no ato. Flávio disse que vai ajudar os cidadãos de cada estado, seja qual for o partido do governador.",
  pecas: [
    [0, CAB + chip("Os passos de Flávio Bolsonaro (PL)") + linha(420, "Podemos · Brasília, 08/10", "Renata Abreu anuncia o apoio oficial do Podemos", "Reunião no QG do Lago Sul · Correio Braziliense, SBT News")],
    [1, linha(700, "Ato com governadores eleitos · 08/10", "14 governadores eleitos no Brasil 21, em Brasília", "Otaviano Pivetta (MT) estava no ato, fora da foto oficial (TMC, Poder360) · Metrópoles, Correio Braziliense")],
    [2, linha(1060, "O que Flávio disse", "“…vou ajudar os cidadãos de cada estado, independentemente da coloração partidária de quem for governador”", "Falou aos governadores “que não nos apoiam” e citou Raquel Lyra (PE) · Metrópoles")],
  ],
  quando: [null, "Depois, Flávio reuniu", "Flávio disse"],
});
cenas.push({
  voz: "B", movimento: "zoom-in",
  fala: "Também na quinta, Augusto Cury, do Avante, terceiro colocado no primeiro turno, declarou apoio a Flávio. Antes, Flávio assinou um termo com oito compromissos. Entre eles, o fim da reeleição, educação em tempo integral, telemedicina no SUS e microcrédito pelo BNDES. A carta diz que a confiança de Cury não é um cheque em branco.",
  pecas: [
    [0, CAB + chip("Apoio de Augusto Cury · 08/10") + linha(420, "Augusto Cury (Avante)", "3º no 1º turno, com 2,89% dos votos válidos", "Gazeta do Povo, Exame")],
    [1, linha(680, "Termo assinado por Flávio", "8 compromissos", "Fim da reeleição · educação em tempo integral e valorização dos professores · telemedicina no SUS · proteção às mulheres · cooperativismo · microcrédito pelo BNDES · dobrar a produção de alimentos em 10 anos · pacificação nacional")],
    [2, cartaoPost(pFlavioCury, { topo: 1080, imagemMax: 420 })],
  ],
  quando: [null, "Antes, Flávio assinou", "A carta diz"],
});
cenas.push({
  voz: "B", movimento: "parado",
  fala: "À noite, na live semanal no YouTube, Flávio prometeu manter o Bolsa Família e o Pé-de-Meia, e dar às aposentadorias reajuste acima da inflação. Também recitou versos pelo Dia do Nordestino. Mais cedo, tinha negado que vá cortar benefícios. Disse: “O Brasil é riquíssimo, não vou fazer economia em cima das pessoas que mais precisam”.",
  citacao: true,
  pecas: [
    [0, CAB + chip("Live de quinta · 08/10") + linha(420, "Promessas na live", "Bolsa Família e Pé-de-Meia mantidos; aposentadoria com reajuste acima da inflação", "Times Brasil, Jornal de Brasília")],
    [1, cartaoPost(pFlavioLive, { topo: 700, imagemMax: 420 })],
    [2, linha(1420, "Aposentadoria · Brasília, 08/10", "“O Brasil é riquíssimo, não vou fazer economia em cima das pessoas que mais precisam”", "Depois da reunião com o Podemos · Metrópoles, BPMoney")],
  ],
  quando: [null, "Também recitou", "Mais cedo"],
});
cenas.push({
  voz: "B", movimento: "pan-esq",
  fala: "Os próximos passos de Flávio. Nesta sexta, ele começa um giro pelo Sudeste, com um encontro no Rio de Janeiro, ao lado do governador eleito Douglas Ruas. Segundo a CNN Brasil, o roteiro do fim de semana ainda não está fechado e pode incluir São Gonçalo, no sábado, e cidades paulistas, no domingo. Em Cuiabá, um ato de apoio a Flávio está marcado para terça, dia treze, às dezoito horas.",
  pecas: [
    [0, CAB + chip("Próximos passos · Flávio")],
    [1, linha(420, "Sex 09/10 · Rio de Janeiro", "Encontro com Douglas Ruas e aliados na Barra da Tijuca", "Início do giro pelo Sudeste · CartaCapital, CNN Brasil")],
    [2, linha(700, "Sáb 10 e dom 11/10", "São Gonçalo (RJ) e cidades de São Paulo, segundo a CNN Brasil", "Roteiro ainda não fechado pela campanha")],
    [3, linha(980, "Ter 13/10 · 18h", "Ato de apoio a Flávio em Cuiabá", "Organizado por lideranças de MT · Muvuca Popular, HNT")],
  ],
  quando: [null, "Nesta sexta", "Segundo a CNN", "Em Cuiabá"],
});

// ============================================================ BLOCO 3 (voz A) — os passos de Lula
cenas.push({
  voz: "A", movimento: "zoom-out",
  fala: "Os passos de Lula. Na quinta, ele ficou no Palácio da Alvorada, em Brasília, com reuniões de campanha, uma delas com o ministro Sidônio Palmeira. À noite, falou com a imprensa no comitê. Sobre o Datafolha, disse: “O único jeito de você ganhar uma eleição é você ganhar voto”. E afirmou que não avalia pesquisa.",
  citacao: true,
  pecas: [
    [0, CAB + chip("Os passos de Lula (PT)") + linha(420, "Qui 08/10 · Palácio da Alvorada", "Reuniões de campanha, entre elas com Sidônio Palmeira", "Metrópoles, Agência Brasil")],
    [1, cartaoPost(pLulaImprensa, { topo: 700, imagemMax: 420 })],
    [2, linha(1420, "Sobre o Datafolha · QG da campanha", "“O único jeito de você ganhar uma eleição é você ganhar voto.”", "“Não avalio pesquisa, não trabalho assim” · Metrópoles, Jornal de Brasília")],
  ],
  quando: [null, "À noite", "Sobre o Datafolha"],
});
cenas.push({
  voz: "A", movimento: "zoom-in",
  fala: "Nesta sexta, Lula voltou às ruas. Fez uma caminhada em Ceilândia, no Distrito Federal, ao lado de Leandro Grass, do PT. Saiu da Feira Central num trio elétrico, com ministros e deputados. No sábado, vai a Natal, no Rio Grande do Norte, para uma passeata no bairro do Alecrim, com Fátima Bezerra e Cadu Xavier, do PT.",
  pecas: [
    [0, CAB + chip("Lula nas ruas · 09/10") + linha(420, "Sex 09/10 · Ceilândia (DF)", "Caminhada com Leandro Grass (PT), a partir da Feira Central", "Trio elétrico, com ministros e deputados · Metrópoles, Correio Braziliense")],
    [1, cartaoPost(pLulaDF, { topo: 700, imagemMax: 420 })],
    [2, linha(1420, "Sáb 10/10 · Natal (RN)", "Passeata no Alecrim, com Fátima Bezerra e Cadu Xavier (PT)", "Concentração às 8h na Av. Coronel Estevam; local mudou · Tribuna do Norte, Correio Braziliense")],
  ],
  quando: [null, "Saiu da Feira", "No sábado"],
});

// ============================================================ BLOCO 4 (voz B) — pesquisas
cenas.push({
  voz: "B", movimento: "zoom-in",
  fala: "As pesquisas. O Datafolha divulgou na quinta à noite a primeira pesquisa dele no segundo turno. Em votos válidos, Flávio Bolsonaro tem cinquenta e dois por cento, e Lula, quarenta e oito. Nos votos totais, Flávio tem quarenta e nove, e Lula, quarenta e cinco. Brancos, nulos e nenhum somam cinco por cento, e indecisos, um. A margem de erro é de dois pontos.",
  pecas: [
    [0, CAB + chip("Pesquisa registrada · Datafolha")],
    [1, barras(420, "Datafolha · votos válidos", [["Flávio Bolsonaro (PL)", 52], ["Lula (PT)", 48]], "Divulgada em 08/10 à noite", 60)],
    [2, barras(800, "Datafolha · votos totais", [["Flávio Bolsonaro (PL)", 49], ["Lula (PT)", 45], ["Branco/nulo/nenhum", 5], ["Não sabe", 1]], "Registro TSE BR-02949/2026 · contratantes: Folha de S.Paulo e TV Globo · 2.520 entrevistas · 6 e 7/10/2026 · margem de 2 pontos · confiança de 95% · Metrópoles, Gazeta do Povo", 60)],
  ],
  quando: [null, "Em votos válidos", "Nos votos totais"],
});
cenas.push({
  voz: "B", movimento: "pan-dir",
  fala: "Nesta sexta, saiu a pesquisa da Vox Brasil. Nos votos totais, Lula tem quarenta e quatro vírgula dois por cento, e Flávio, quarenta e dois vírgula sete. Brancos e nulos somam três vírgula quatro, e nove vírgula sete por cento não souberam responder. A margem é de dois vírgula quinze pontos. As reportagens não trazem os votos válidos. Pesquisa é retrato do momento.",
  pecas: [
    [0, CAB + chip("Pesquisa registrada · Vox Brasil")],
    [1, barras(420, "Vox Brasil · votos totais", [["Lula (PT)", 44.2], ["Flávio Bolsonaro (PL)", 42.7], ["Branco/nulo/nenhum", 3.4], ["Não sabe", 9.7]], "Registro TSE BR-09623/2026 · contratante: o próprio instituto · 2.100 entrevistas presenciais · 5 a 7/10/2026 · margem de 2,15 pontos · confiança de 95% · Brasil 247, CartaCapital", 60)],
    [2, pill(1000, "Pesquisa é retrato do momento") + nota(1120, "Votos válidos não divulgados nas reportagens. Nenhuma das duas pesquisas teve a divulgação suspensa pela Justiça Eleitoral até a manhã de 09/10 (busca do HOJE MT).")],
  ],
  quando: [null, "Nos votos totais", "retrato do momento"],
});

// ============================================================ BLOCO 5 (voz A) — Justiça Eleitoral
cenas.push({
  voz: "A", movimento: "pan-esq",
  fala: "Na Justiça Eleitoral, o plenário do TSE mandou Flávio apagar, em vinte e quatro horas, três postagens de maio. Uma é um vídeo feito com inteligência artificial sem o rótulo exigido; duas associam Lula a facções criminosas. A pedido de Flávio, ministros do TSE mandaram remover vídeos da campanha de Lula, publicações de aliados e um vídeo de Janja. Os pedidos de direito de resposta ainda serão analisados.",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral · 08/10")],
    [1, linha(420, "TSE · plenário, por unanimidade", "Flávio tem 24h para apagar 3 posts no X, de 30 e 31/05", "Relator André Mendonça; um vídeo com IA sem rótulo e dois que associam Lula a facções; multa diária · TSE, CNN Brasil")],
    [2, linha(740, "TSE · liminares a pedido de Flávio", "Remoção de vídeos da campanha de Lula, de posts de aliados e de um vídeo de Janja", "André Mendonça: 2 vídeos da campanha e 5 posts de André Janones e Lindbergh Farias, em 3h · Nunes Marques: vídeo de Janja, em 24h · SBT News, Correio, Revista Oeste")],
    [3, pill(1120, "Direito de resposta: análise depois das defesas", 30)],
  ],
  quando: [null, "o plenário do TSE", "A pedido de Flávio", "direito de resposta"],
});
cenas.push({
  voz: "A", movimento: "parado",
  fala: "O TSE também tirou de pauta o recurso sobre o registro de Deltan Dallagnol, do Novo, ao Senado pelo Paraná. Não há nova data. E o ministro Alexandre de Moraes ainda não decidiu se Flávio pode voltar a visitar o pai, Jair Bolsonaro, que cumpre prisão domiciliar.",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral e STF")],
    [1, linha(420, "TSE · 08/10", "Julgamento do registro de Deltan Dallagnol (Novo, Senado-PR) sai de pauta", "Sem nova data · Gazeta do Povo, O Tempo")],
    [2, linha(720, "STF · pendente", "Visitas de Flávio ao pai: decisão cabe a Alexandre de Moraes", "A PGR deu parecer favorável em 06/10; até a manhã de 09/10 não havia decisão publicada · O Tempo, Agência Brasil")],
  ],
  quando: [null, "Deltan", "Alexandre de Moraes"],
});

// ============================================================ BLOCO 6 (voz B) — Mato Grosso
cenas.push({
  voz: "B", movimento: "zoom-out",
  fala: "Em Mato Grosso, o deputado estadual Max Russi entregou a Flávio, em Brasília, uma carta de apoio assinada por dezoito deputados. O deputado Lúdio Cabral, do PT, não assinou, segundo a Gazeta Digital. Na Câmara de Cuiabá, vinte dos vinte e sete vereadores assinaram um manifesto de apoio a Flávio e fizeram um adesivaço. Os vereadores que não assinaram e a campanha de Lula em Cuiabá não se manifestaram nas reportagens.",
  pecas: [
    [0, CAB + chip("Mato Grosso")],
    [1, linha(420, "Assembleia Legislativa · 08/10", "Carta de 18 deputados de MT entregue a Flávio por Max Russi", "13 deputados atuais e 5 eleitos; 11 atuais não assinaram · HNT, Gazeta Digital")],
    [2, linha(720, "Câmara de Cuiabá · 08/10", "20 dos 27 vereadores assinam o manifesto “Cuiabá é 22” e fazem adesivaço", "Articulado por Dilemário Alencar (União) · RepórterMT, Infoverus")],
    [3, nota(1060, "Os sete vereadores que não assinaram e a campanha de Lula em MT não se manifestaram nas reportagens citadas.")],
  ],
  quando: [null, "Em Mato Grosso", "Na Câmara de Cuiabá", "Os vereadores que não assinaram"],
});
cenas.push({
  voz: "B", movimento: "zoom-in",
  fala: "E o Tribunal de Justiça de Mato Grosso elegeu os desembargadores Hélio Nishiyama e Jorge Luiz Tadeu Rodrigues para o Tribunal Regional Eleitoral. O presidente e o vice serão escolhidos pelo próprio TRE.",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral em MT")],
    [1, linha(420, "TJMT · 08/10", "Hélio Nishiyama (29 votos) e Jorge Luiz Tadeu Rodrigues (25) eleitos para o TRE-MT", "Biênio 2027-2028; posse em abril; Mário Kono teve 9 votos · HNT, RDNews")],
    [2, nota(760, "A presidência e a vice-presidência do TRE-MT são escolhidas depois, pelo próprio tribunal.")],
  ],
  quando: [null, "Hélio Nishiyama", "O presidente e o vice"],
});

for (const [i, c] of cenas.entries())
  for (const q of c.quando)
    if (q && !c.fala.toLowerCase().includes(q.toLowerCase()))
      throw new Error(`cena ${i + 2}: trecho "${q}" não está na fala`);

// ------------------------------------------------------------ render
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const roteiro = [];
const VOZ = {
  A: { motor: "edge", narrador: "pt-BR-AntonioNeural", velocidade: "+6%", tom: "+1Hz" },
  B: { motor: "edge", narrador: "pt-BR-ThalitaMultilingualNeural", velocidade: "+4%", tom: "+0Hz" },
};
for (const [i, c] of cenas.entries()) {
  const n = i + 1;
  const arq = (suf) => `${PREFIXO}-${n}-${suf}.png`;
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 17 + 9)}</body></html>`);
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
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 17 + 9)}${c.pecas.map(([, h]) => h).join("")}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(PREVIA, `${n}.png`) });
  roteiro.push({
    n: n + 1, quem: "narrador", fala: c.fala, ...(c.citacao ? { citacao: true } : {}), voz: VOZ[c.voz],
    imagem: `${PASTA}/cenas/${arq("fundo")}`, movimento: c.movimento, camadas: lista,
    ...(c.clipe ? { clipe: c.clipe } : {}),
  });
}
await browser.close();
writeFileSync(join(SCRATCH, "b10-cenas.json"), JSON.stringify(roteiro, null, 1));
const palavras = cenas.reduce((s, c) => s + c.fala.trim().split(/\s+/).length, 0);
console.log(`${cenas.length} cenas, ${palavras} palavras de fala (sem intro e fechamento); roteiro parcial em ${join(SCRATCH, "b10-cenas.json")}; prévias em ${PREVIA}`);
