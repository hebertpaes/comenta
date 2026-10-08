/* global document */
// Slides (1080×1920) do boletim em vídeo nº 9 — primeiro BOLETIM DIÁRIO APROFUNDADO
// do 2º turno (pedido do editor em 08/10/2026: "mais aprofundado e com imagens e
// vídeos disponíveis nas redes. Com mais detalhes e gráficos com uma voz aprimorada
// e mais português do Brasil possível e com maior tempo de análise com mais
// detalhes dos passos dos candidatos a presidência"). Formato só voz e slides,
// sem música, intro e fechamento padrão; ~5 min (limite_s no roteiro); dupla de
// narradores sintéticos genéricos (voz v8: Antonio +6% +1 Hz e Thalita +4%, por
// bloco temático, nunca por candidato — tratamento igual).
// Tema: os passos de Flávio Bolsonaro (PL) e de Lula (PT) de 05 a 08/10, a primeira
// pesquisa registrada do 2º turno (PoderData/Aya BR-08134/2026), a Justiça
// Eleitoral, o calendário até 25/10 e Mato Grosso.
// Apuração: /tmp/hojemt/boletim-diario/{flavio,lula,pesq}.json (agentes de 08/10),
// resultado oficial do TSE (br-c0001 e mt-c0001 em hojemt.com.br/content/media/apuracao/).
// A intro (cena 1) sai do intro-boletim.mjs e o fechamento (última cena) do
// fechamento-boletim.mjs; aqui ficam as cenas 2 a 14 (arquivos <prefixo>-1… a -13…).
// Regras: pesquisa com ficha completa; tratamento igual; falas entre aspas só literais;
// posts e vídeos só de perfis oficiais, sem áudio original, com crédito; nada de
// peça de ataque de um candidato contra o outro reproduzida como imagem.
// Uso: node graficos-boletim-09.mjs
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
const PREFIXO = "2026-10-08-boletim-09";
const PREVIA = join(SCRATCH, "b9-previa");
const CACHE = join(SCRATCH, "redes-cache");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

// ------------------------------------------------------------ confere o resultado oficial (TSE via apuração do site)
const erros = [];
function leJson(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
const br = leJson(join(SCRATCH, "apuracao-br.json")), mt = leJson(join(SCRATCH, "apuracao-mt.json"));
function pctDe(j, nome) {
  if (!j) return null;
  const c = (j.cand || j.candidatos || []).find((x) => (x.nm || x.nome || "").toUpperCase().includes(nome.toUpperCase()));
  return c ? Number(String(c.pvap || c.pct || c.percentual_validos || "").replace(",", ".")) : null;
}
const esperado = { br: { "FLÁVIO": 47.03, "LULA": 45.16 }, mt: { "FLÁVIO": 65.15, "LULA": 29.18 } };
for (const [k, j] of [["br", br], ["mt", mt]]) {
  if (!j) { erros.push(`apuracao-${k}.json não está em ${SCRATCH} (baixe de hojemt.com.br/content/media/apuracao/${k}-c0001.json)`); continue; }
  for (const [n, v] of Object.entries(esperado[k])) { const got = pctDe(j, n); if (got !== null && Math.abs(got - v) > 0.011) erros.push(`${k} ${n}: esperado ${v}, apuração ${got}`); }
}
if (erros.length) throw new Error("confira os números antes de montar:\n- " + erros.join("\n- "));

// ------------------------------------------------------------ posts (redes-cache; só perfis oficiais)
function post(id, data, credito) {
  const j = leJson(join(CACHE, `${id}.json`));
  if (!j || !j.imagem || !existsSync(j.imagem)) throw new Error(`post ${id} não está no cache de redes (rode redes-post.mjs)`);
  return { ...j, data, credito };
}
const pFlavioGoiania = post("youtube-w0JHCiYshRo", "2026-10-06", "Reprodução: @flaviobolsonaro no YouTube, 06/10/2026");
const pFlavioApoios = post("youtube-bPxevzkag54", "2026-10-07", "Reprodução: @flaviobolsonaro no YouTube, 07/10/2026");
const pLulaReuniao = post("youtube-Dn0fHiWl3ys", "2026-10-05", "Reprodução: @LulaOficial no YouTube, 05/10/2026");
const pLulaPlenaria = post("youtube-2w-2NzLulLU", "2026-10-07", "Reprodução: @LulaOficial no YouTube, 07/10/2026");
// clipes (sem o áudio original): TikTok 1080×1920 e X 576×1024, ambos 9:16
const CLIPE_FLAVIO = { arquivo: join(CACHE, "tiktok-7693889445606509845.mp4"), inicio: 13.6, fim: 23.1, origem_url: "https://www.tiktok.com/@flaviobolsonaro/video/7693889445606509845", credito: "Reprodução: @flaviobolsonaro no TikTok, 07/10/2026" };
const CLIPE_LULA = { arquivo: join(CACHE, "x-2107830931474223283.mp4"), inicio: 15, fim: 25, origem_url: "https://x.com/LulaOficial/status/2107830931474223283", credito: "Reprodução: @LulaOficial no X, 07/10/2026" };
for (const c of [CLIPE_FLAVIO, CLIPE_LULA]) if (!existsSync(c.arquivo)) throw new Error(`clipe não está no cache: ${c.arquivo}`);
const CAIXA = [590, 500, 420, 747]; // 9:16 à direita; cartões à esquerda com largura 490
// moldura do clipe com o crédito abaixo, da margem esquerda (o molduraVideo da lib põe o crédito a partir do x da caixa e estoura)
const moldura = ([x, y, w, h], credito) => `<div class="janela" style="left:${x - 3}px;top:${y - 3}px;width:${w + 6}px;height:${h + 6}px"></div><div class="cred-video" style="left:70px;top:${y + h + 24}px">${esc(credito)}</div>`;

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

// ============================================================ BLOCO 1 (voz A) — panorama
cenas.push({
  voz: "A", movimento: "zoom-in",
  fala: "O segundo turno para presidente já começou. Flávio Bolsonaro, do PL, e Lula, do PT, voltam às urnas em vinte e cinco de outubro. No primeiro turno, Flávio teve quarenta e sete vírgula zero três por cento dos votos válidos. Lula teve quarenta e cinco vírgula dezesseis. A diferença foi de um vírgula oitenta e sete ponto. Mais de trinta e três milhões de eleitores não compareceram.",
  pecas: [
    [0, CAB + chip("2º turno · 25 de outubro") + tit("Flávio <b>x</b> Lula", 420)],
    [1, barras(640, "1º turno · votos válidos (TSE, 100% das seções)", [["Flávio Bolsonaro (PL)", 47.03], ["Lula (PT)", 45.16], ["Augusto Cury (Avante)", 2.89], ["Renan Santos (Missão)", 2.24], ["Ronaldo Caiado (PSD)", 2.18], ["Zema (Novo)", 0.27]], "Diferença de 2.224.965 votos (1,87 ponto); Samara, Hertz Dias, Clariana Barão e Edmilson Costa abaixo de 0,1%")],
    [2, linha(1290, "Participação", "Abstenção: 33.469.244 eleitores (21,08%)", "Comparecimento de 78,92% · brancos 1,84% · nulos 2,93% · TSE, totalização de 05/10")],
  ],
  quando: [null, "quarenta e sete", "trinta e três milhões"],
});
cenas.push({
  voz: "A", movimento: "pan-dir",
  fala: "A propaganda gratuita no rádio e na televisão começa nesta sexta-feira, dia nove, e vai até o dia vinte e três. O TSE aprovou tempo igual para os dois: cinco minutos para cada um em cada bloco. Os debates previstos são na Record, no dia onze; num grupo de onze veículos, no dia quinze; na Band, no dia dezoito; e na Globo, no dia vinte e três. Flávio disse que vai aos debates. Lula disse que agora o debate é importante. Nenhum dos dois confirmou cada data.",
  pecas: [
    [0, CAB + chip("Calendário até a votação")],
    [1, agenda(420, [["Sex 9/10", "Começa a propaganda gratuita", "Rádio 7h e 12h; TV 13h e 20h30 (Brasília), até 23/10 · tempo igual: 5 min para cada um por bloco (TSE, 06/10)"], ["Dom 11/10", "Debate na Record (previsto)", "Band transferiu o dela para 18/10"], ["Qui 15/10", "Debate de um pool de 11 veículos (previsto)"], ["Dom 18/10", "Debate na Band, 20h"], ["Sex 23/10", "Debate na Globo (previsto) · fim da propaganda gratuita"], ["Dom 25/10", "Votação", "Das 8h às 17h de Brasília; em MT, das 7h às 16h, hora local"]])],
    [2, pill(1620, "Presença nos debates ainda não confirmada data a data", 30)],
  ],
  quando: [null, "A propaganda gratuita", "Nenhum dos dois"],
});

// ============================================================ BLOCO 2 (voz B) — os passos de Flávio Bolsonaro
cenas.push({
  voz: "B", movimento: "zoom-out",
  fala: "Os passos de Flávio Bolsonaro. Desde segunda-feira, ele trabalha no comitê da campanha, no Lago Sul, em Brasília. Na terça, viajou a Goiânia. Lá, o ex-governador Ronaldo Caiado, do PSD, quinto colocado no primeiro turno, declarou apoio a ele. Caiado disse: “Estarei com Flávio de corpo inteiro”.",
  citacao: true,
  pecas: [
    [0, CAB + chip("Os passos de Flávio Bolsonaro (PL)") + linha(420, "05 a 08/10", "Brasília (QG do Lago Sul) e Goiânia (06/10)", "Reuniões com o vice Alfredo Gaspar, Rogério Marinho (coordenador) e Tarcísio de Freitas · SBT News, Correio da Manhã")],
    [1, linha(700, "Apoio · Goiânia, 06/10", "Ronaldo Caiado (PSD), 5º no 1º turno, declarou apoio", "No comitê do governador Daniel Vilela (MDB); primeiro evento fora de Brasília · CNN Brasil, Metrópoles")],
    [2, cartaoPost(pFlavioGoiania, { topo: 980, imagemMax: 520 })],
  ],
  quando: [null, "Na terça", "Caiado disse"],
});
cenas.push({
  voz: "B", movimento: "zoom-in",
  fala: "Na quarta-feira, três partidos oficializaram apoio a Flávio em Brasília: a federação União Progressista, que reúne União Brasil e PP; o Novo, de Romeu Zema; e o Republicanos, de Tarcísio de Freitas. A senadora Tereza Cristina, do PP, disse que a decisão foi unânime.",
  pecas: [
    [0, CAB + chip("Apoios oficializados · 07/10")],
    [1, linha(420, "Federação União Progressista", "União Brasil + PP, neutros no 1º turno", "Coletiva no QG da campanha; Tereza Cristina (PP-MS): decisão unânime · CNN Brasil, Metrópoles") + linha(690, "Novo", "Partido de Romeu Zema, 6º no 1º turno", "Anúncio de Eduardo Ribeiro e Deltan Dallagnol · Metrópoles, Gazeta do Povo") + linha(960, "Republicanos", "Partido de Tarcísio de Freitas, neutro no 1º turno", "Anúncio de Marcos Pereira, em Brasília · CNN Brasil, Agência Brasil")],
    [2, cartaoPost(pFlavioApoios, { topo: 1250, imagemMax: 300 })],
  ],
  quando: [null, "a federação", "Tereza Cristina"],
});
cenas.push({
  voz: "B", movimento: "parado",
  fala: "Em entrevista coletiva, Flávio defendeu mudar a Constituição por emenda. Citou a redução da maioridade penal, a reforma do Judiciário e o fim da reeleição. Disse que, se eleito, não disputará um segundo mandato. Nas redes, publicou um vídeo sobre o Bolsa Família. Segundo ele, o programa não vai acabar e vai melhorar.",
  clipe: { ...CLIPE_FLAVIO, caixa: CAIXA },
  pecas: [
    [0, CAB + chip("Propostas e redes · 07/10") + moldura(CAIXA, CLIPE_FLAVIO.credito)],
    [1, cardEsq(500, "Coletiva · Brasília", "PECs: maioridade penal, Judiciário, fim da reeleição", "Diz que não disputará segundo mandato · Agência Brasil, CNN Brasil")],
    [2, cardEsq(900, "Bolsa Família · redes", "“Não acredite quando disserem que o programa vai acabar”", "Legenda do post oficial: promete manter o benefício de quem conseguir emprego formal")],
  ],
  quando: [null, "Em entrevista", "Nas redes"],
});
cenas.push({
  voz: "B", movimento: "pan-esq",
  fala: "Os próximos passos de Flávio. Nesta quinta, estava prevista uma reunião com o Podemos para formalizar mais um apoio. Segundo o coordenador da campanha, senador Rogério Marinho, as viagens recomeçam na sexta, por São Paulo.",
  pecas: [
    [0, CAB + chip("Próximos passos · Flávio")],
    [1, linha(420, "Qui 08/10 · 8h", "Reunião com o Podemos no QG, em Brasília", "Para formalizar o apoio do partido; sem confirmação publicada até a manhã · Correio Braziliense, Metrópoles") + linha(700, "Sex 09/10", "Viagens recomeçam por São Paulo", "Segundo Rogério Marinho (PL), coordenador da campanha · Estadão Conteúdo") + linha(980, "Ter 13/10 · 18h", "Ato de apoio a Flávio em Cuiabá", "Organizado por lideranças de MT · Muvuca Popular, HNT")],
  ],
  quando: [null, "Nesta quinta"],
});

// ============================================================ BLOCO 3 (voz A) — os passos de Lula
cenas.push({
  voz: "A", movimento: "zoom-out",
  fala: "Os passos de Lula. Ele não viajou: ficou em Brasília de segunda a quinta, entre o Palácio da Alvorada e o comitê da campanha. Recebeu governadores do Nordeste e reorganizou a coordenação. Camilo Santana passou a dividir o comando com Edinho Silva. Na segunda, Lula disse que agora é importante ter debate na televisão. No primeiro turno, ele não foi a nenhum.",
  pecas: [
    [0, CAB + chip("Os passos de Lula (PT)") + linha(420, "05 a 08/10", "Brasília: Palácio da Alvorada e QG da campanha", "Reuniões com governadores do Nordeste, Geraldo Alckmin, Rui Costa e Jaques Wagner · Metrópoles, Agência Brasil")],
    [1, linha(700, "Coordenação", "Camilo Santana divide o comando com Edinho Silva", "Sidônio Palmeira (Secom) e o marqueteiro Raul Rabelo gravam os programas de TV · Metrópoles, Folha")],
    [2, cartaoPost(pLulaReuniao, { topo: 980, imagemMax: 520 })],
  ],
  quando: [null, "Recebeu governadores", "Na segunda"],
});
cenas.push({
  voz: "A", movimento: "zoom-in",
  fala: "Na quarta, numa reunião com os parlamentares eleitos, Lula desafiou Flávio a votar pelo fim da escala seis por um. Ele disse: “Eu desafio ele a votar favoravelmente”. Defendeu a PEC da Segurança Pública. E admitiu que esta foi a campanha menos organizada de que participou desde mil novecentos e oitenta e nove.",
  citacao: true,
  pecas: [
    [0, CAB + chip("Plenária com os eleitos · 07/10")],
    [1, linha(420, "Escala 6x1", "“Eu desafio ele a votar favoravelmente.”", "Fim da escala 6x1 sem redução de salário; Flávio defende que o trabalhador escolha · Agência Brasil, Ric.com.br") + linha(700, "Segurança", "Defendeu a PEC da Segurança Pública", "Presídios de segurança máxima e Ministério da Segurança · Agência Brasil") + linha(980, "Autocrítica", "“A campanha menos organizada” desde 1989", "CNN Brasil, O Povo")],
    [2, cartaoPost(pLulaPlenaria, { topo: 1230, imagemMax: 300 })],
  ],
  quando: [null, "Ele disse", "E admitiu"],
});
cenas.push({
  voz: "A", movimento: "parado",
  fala: "No mesmo dia, Lula começou a gravar vídeos em formato selfie. Num deles, chama os apoiadores às ruas. Em outro, fala do fim da escala seis por um. Nas redes, prometeu incluir exames e teleconsultas no Farmácia Popular.",
  clipe: { ...CLIPE_LULA, caixa: CAIXA },
  pecas: [
    [0, CAB + chip("Redes · 07/10") + moldura(CAIXA, CLIPE_LULA.credito)],
    [1, cardEsq(500, "Vídeos selfie", "Nove postagens no dia, ideia do governador Rafael Fonteles (PT-PI)", "Correio Braziliense, Metrópoles")],
    [2, cardEsq(900, "Farmácia Popular · X", "“No próximo mandato, vamos incluir exames e teleconsultas.”", "Post oficial @LulaOficial, 07/10")],
  ],
  quando: [null, "Num deles", "Nas redes"],
});
cenas.push({
  voz: "A", movimento: "pan-dir",
  fala: "Até agora, Lula não ganhou a adesão de nenhum partido novo nem de candidato derrotado no primeiro turno. Cinco governadores eleitos, todos do Nordeste, apoiam a campanha dele. Os próximos passos: caminhada em Ceilândia, no Distrito Federal, nesta sexta; e ato em Natal, no sábado.",
  pecas: [
    [0, CAB + chip("Apoios e próximos passos · Lula")],
    [1, linha(420, "Aliança", "PT, PCdoB, PV, PSB, PDT, PSOL e Rede, como no 1º turno", "PSD e MDB liberaram os filiados · Agência Brasil, Metrópoles") + linha(700, "Governadores eleitos", "5 apoiam: Jerônimo (BA), Elmano (CE), Fonteles (PI), Mitidieri (SE) e Lucas Ribeiro (PB)", "Gazeta do Povo, Metrópoles")],
    [2, linha(1000, "Sex 09/10", "Caminhada em Ceilândia (DF) com Leandro Grass (PT)", "Brasil de Fato, Metrópoles") + linha(1270, "Sáb 10/10 · 14h", "Ato em Natal (RN) com Cadu Xavier (PT)", "Primeira agenda de rua do 2º turno · Tribuna do Norte, Agência Brasil")],
  ],
  quando: [null, "Cinco governadores", "Os próximos passos"],
});

// ============================================================ BLOCO 4 (voz B) — pesquisa
cenas.push({
  voz: "B", movimento: "zoom-in",
  fala: "A primeira pesquisa registrada do segundo turno é da PoderData, com a Aya. Em votos válidos, Flávio Bolsonaro tem cinquenta e três por cento, e Lula, quarenta e sete. A margem de erro é de um vírgula oito ponto. Pesquisa é retrato do momento. O Datafolha divulga a primeira pesquisa dele nesta quinta, no fim da tarde.",
  pecas: [
    [0, CAB + chip("Pesquisa registrada · 2º turno")],
    [1, barras(420, "PoderData/Aya · 5 a 7/10 · votos válidos", [["Flávio Bolsonaro (PL)", 53], ["Lula (PT)", 47]], "Registro TSE BR-08134/2026 · contratante: o próprio instituto · 3.000 entrevistas · 5 a 7/10/2026 · margem de 1,8 ponto · confiança de 95% · CNN Brasil, Gazeta do Povo, CartaCapital", 60)],
    [2, pill(900, "Pesquisa é retrato do momento") + linha(1020, "Qui 08/10 · 18h45 (Brasília)", "Datafolha divulga a primeira pesquisa do 2º turno", "Registro BR-02949/2026 · 2.520 entrevistas · 6 a 8/10 · margem de 2 pontos · Brasil de Fato, Brasil 247")],
  ],
  quando: [null, "Em votos válidos", "retrato do momento"],
});

// ============================================================ BLOCO 5 (voz A) — Justiça Eleitoral
cenas.push({
  voz: "A", movimento: "pan-esq",
  fala: "Na Justiça Eleitoral, o TSE aprovou por unanimidade o plano de mídia do segundo turno, com tempos iguais para os dois candidatos. O presidente do tribunal, Kassio Nunes Marques, negou pedidos da campanha de Lula para tirar do ar vídeos da campanha de Flávio e para dar direito de resposta. E a Procuradoria-Geral da República deu parecer favorável a que Flávio volte a visitar o pai, Jair Bolsonaro, que cumpre prisão domiciliar. A decisão é do ministro Alexandre de Moraes.",
  pecas: [
    [0, CAB + chip("Justiça Eleitoral · 05 a 07/10")],
    [1, linha(420, "TSE · 06/10", "Plano de mídia aprovado por unanimidade: tempos iguais", "Relator Nunes Marques; 5 min por candidato em cada bloco e 12min30s de inserções por dia · Gazeta do Povo, Meio & Mensagem")],
    [2, linha(720, "TSE · 07/10", "Nunes Marques nega tirar do ar vídeos de Flávio e nega direito de resposta a Lula", "Peças sobre governo e STF, inflação e endividamento · O Tempo, Gazeta do Povo")],
    [3, linha(1040, "PGR · 06/10", "Parecer favorável à volta das visitas de Flávio ao pai", "Visitas suspensas por 90 dias em julho; decisão cabe a Alexandre de Moraes (STF) · Agência Brasil, CNN Brasil")],
  ],
  quando: [null, "o TSE aprovou", "Kassio Nunes Marques", "a Procuradoria-Geral"],
});

// ============================================================ BLOCO 6 (voz B) — Mato Grosso
cenas.push({
  voz: "B", movimento: "zoom-out",
  fala: "Em Mato Grosso, Flávio teve sessenta e cinco vírgula quinze por cento dos votos válidos no primeiro turno. Lula teve vinte e nove vírgula dezoito. Flávio ficou à frente em cento e trinta e três cidades, e Lula, em nove. O governador Otaviano Pivetta e os senadores eleitos Mauro Mendes e José Medeiros declararam apoio a Flávio. Aliados de Lula fazem atos de rua em Cuiabá até sábado. Um ato de apoio a Flávio está marcado para terça, dia treze, às dezoito horas, em Cuiabá.",
  pecas: [
    [0, CAB + chip("Mato Grosso")],
    [1, barras(420, "1º turno em MT · votos válidos (TSE)", [["Flávio Bolsonaro (PL)", 65.15], ["Lula (PT)", 29.18], ["Augusto Cury (Avante)", 2.01], ["Renan Santos (Missão)", 1.66], ["Ronaldo Caiado (PSD)", 1.66]], "Flávio à frente em 133 dos 142 municípios; Lula em 9 · hojemt.com.br/apuracao-2026", 70)],
    [2, linha(960, "Apoios a Flávio em MT", "Otaviano Pivetta (Republicanos), Mauro Mendes (União) e José Medeiros (PL)", "Reunião de 05/10 no Paiaguás Palace Hotel, em Cuiabá · 24 Horas MT, Portal Mato Grosso, Primeira Hora")],
    [3, linha(1250, "Atos em Cuiabá", "Pró-Lula: atos de aliados até sábado (11/10) · Pró-Flávio: terça (13/10), 18h", "Nenhum governador ou senador eleito por MT apoia Lula · HNT, Muvuca Popular")],
  ],
  quando: [null, "Em Mato Grosso", "O governador", "Aliados de Lula"],
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
writeFileSync(join(SCRATCH, "b9-cenas.json"), JSON.stringify(roteiro, null, 1));
const palavras = cenas.reduce((s, c) => s + c.fala.trim().split(/\s+/).length, 0);
console.log(`${cenas.length} cenas, ${palavras} palavras de fala (sem intro e fechamento); roteiro parcial em ${join(SCRATCH, "b9-cenas.json")}; prévias em ${PREVIA}`);
