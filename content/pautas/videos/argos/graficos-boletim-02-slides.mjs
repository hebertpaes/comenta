// Slides (1080×1920) do boletim em vídeo nº 2 (26/09/2026) refeito no formato
// "só voz e slides" (editor, 02/10: "Não cite nome do avatar e nem crie
// avatar, simplesmente deixe a voz aprimorada e com slides profissionais
// divulgando o nome do site hojemt e pedindo para seguir e compartilhar nossas
// redes sociais Hoje MT"). Tema: os casos na Justiça Eleitoral e os palanques
// de 23 a 25/9, com os fatos e números DA ÉPOCA.
//
// Dados: o radar-dados.json do commit 0c085c9 (estado do Radar quando o nº 2
// foi feito: justica e grupos atualizados em 26/09, 05:50 MT), lido com
// `git show`. O script confere cada número da fala nesse retrato e lança erro
// se não bater. Única correção (fato da época que se revelou errado): o
// registro de Sargento Laudicério, que o Radar de 26/9 dava como "aguardando
// julgamento", tinha sido deferido pelo TRE-MT em 25/9 (Acórdão 32909; entrou
// no Radar em 29/9) — conferido no radar-dados.json atual. Também saiu dos
// slides a frase do texto publicado "cada caso foi conferido em fonte oficial
// ou em dois veículos" (2 dos 86 casos do retrato tinham um só veículo).
//
// A intro (cena 1) e o fechamento (última cena) já foram gerados por
// intro-boletim.mjs e fechamento-boletim.mjs; aqui ficam as cenas 2 a 8
// (arquivos <prefixo>-1… a <prefixo>-7…, k = cena − 1). Cada cena é um só
// HTML; as camadas saem dele por `data-c` (a camada k mostra só os elementos
// marcados com k, e os outros ficam invisíveis mas ocupam o lugar), então a
// posição de cada peça é a mesma no slide montado e nenhuma peça cobre outra.
// Regras: casos judiciais sem nomes na fala nem termos das peças (como no
// original); apoios dos dois grupos com o mesmo tratamento, em ordem
// alfabética; nada de avatar nem de nome de avatar.
// Uso: node graficos-boletim-02-slides.mjs
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createRequire } from "node:module";

import { SCRATCH, esc, fundo, CSS } from "./slides-lib.mjs";
const require = createRequire(join(SCRATCH, "pw", "package.json"));
const { chromium } = require("playwright-core");

const REPO = "/home/user/comenta/content";
const PASTA = "pautas/videos/argos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-09-26-boletim-02";
const PREVIA = join(SCRATCH, "b2-slides-previa");
mkdirSync(OUT, { recursive: true });
mkdirSync(PREVIA, { recursive: true });

// ------------------------------------------------------------ conferência dos dados
const SNAP = "0c085c9";
const radar = JSON.parse(execFileSync("git", ["-C", "/home/user/comenta", "show", `${SNAP}:content/paginas/radar-dados.json`], { encoding: "utf8", maxBuffer: 64 << 20 }));
const atual = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8"));
const erros = [];
const confere = (rot, dado, fala) => { if (JSON.stringify(dado) !== JSON.stringify(fala)) erros.push(`${rot}: Radar ${JSON.stringify(dado)} × fala ${JSON.stringify(fala)}`); };

confere("justica.atualizado (retrato de 26/9)", radar.justica.atualizado, "26/09/2026 05:50");
confere("grupos.atualizado (retrato de 26/9)", radar.grupos.atualizado, "26/09/2026 05:50");

// casos únicos (o mesmo caso aparece em cada candidato envolvido)
const cands = radar.justica.candidatos;
const casos = new Map();
for (const c of cands)
  for (const it of c.itens || []) {
    const k = [it.data, it.orgao, it.resumo].join("|");
    if (!casos.has(k)) casos.set(k, { it, env: [] });
    casos.get(k).env.push(c);
  }
const lista = [...casos.values()];
const conta = (tipo) => lista.filter((x) => x.it.tipo === tipo).length;
const N = { total: lista.length, decisao: conta("decisao"), andamento: conta("acao_em_andamento"), arquivada: conta("arquivada") };
confere("casos (total, decisões, ações sem julgamento, arquivadas)", N, { total: 86, decisao: 57, andamento: 15, arquivada: 14 });
confere("candidatos (governo, Senado)", [cands.length, cands.filter((c) => c.cargo === "governador").length, cands.filter((c) => c.cargo === "senador").length], [16, 6, 10]);

// as decisões do TRE-MT de 24 e 25/9
const recentes = lista.filter((x) => ["2026-09-24", "2026-09-25"].includes(x.it.data) && x.it.tipo === "decisao");
const tipoDecisao = (r) => (/direito de resposta/i.test(r) ? "resposta" : /impulsion/i.test(r) ? "impulsionamento" : /retirar|remover|excluir/i.test(r) ? "retirada" : "?");
const porTipo = { retirada: 0, impulsionamento: 0, resposta: 0 };
for (const x of recentes) {
  const t = tipoDecisao(x.it.resumo);
  if (!(t in porTipo)) erros.push(`decisão de ${x.it.data} sem classificação: ${x.it.resumo.slice(0, 80)}`);
  else porTipo[t]++;
}
confere("decisões de 24 e 25/9", recentes.length, 10);
confere("todas do TRE-MT", recentes.every((x) => /^TRE-MT/.test(x.it.orgao)), true);
confere("todas em disputas entre candidatos (um pede, outro é alvo)", recentes.every((x) => x.env.length >= 2), true);
confere("retirada / impulsionamento pago / direito de resposta", porTipo, { retirada: 5, impulsionamento: 3, resposta: 2 });
const soSenado = recentes.filter((x) => x.env.every((c) => c.cargo === "senador"));
const comGoverno = recentes.filter((x) => x.env.some((c) => c.cargo === "governador"));
confere("só entre candidatos ao Senado / com candidato ao governo", [soSenado.length, comGoverno.length], [8, 2]);
const multas = recentes.map((x) => x.it.resumo.match(/multad[oa] em R\$ (\d+) mil/)).filter(Boolean).map((m) => +m[1]);
confere("multas aplicadas (R$ mil)", [multas.length, Math.min(...multas), Math.max(...multas)], [3, 5, 10]);
confere("cabe recurso nas 10", recentes.every((x) => x.it.cabe_recurso === true), true);
// só 4 das 10 eram liminares (as outras: 5 de juiz ou juíza auxiliar e 1 em
// mandado de segurança), então o cartão "Liminar" não pode falar das 10
const liminares = recentes.filter((x) => /liminar/i.test(x.it.orgao)).length;
confere("liminares entre as 10 (campo orgao)", liminares, 4);

// registros: o retrato de 26/9 dizia 15 deferidos e Laudicério aguardando;
// o Radar atual mostra que o TRE-MT já tinha deferido em 25/9 (correção)
const pend = cands.filter((c) => c.registro?.situacao !== "deferido").map((c) => `${c.nome}: ${c.registro?.situacao}`);
confere("registros no retrato de 26/9 (o erro corrigido)", pend, ["Sargento Laudicério: aguardando julgamento"]);
const laudAtual = atual.justica.candidatos.find((c) => c.nome === "Sargento Laudicério")?.registro || {};
confere("Laudicério no Radar atual: deferido", laudAtual.situacao, "deferido");
if (!/Deferido por unanimidade em 25\/9/.test(laudAtual.obs || "") || !/Acórdão 32909/.test(laudAtual.obs || "") || !/Karen Fortes/.test(laudAtual.obs || "") || !/Cabe recurso/.test(laudAtual.obs || ""))
  erros.push("registro de Laudicério no Radar atual não diz mais 'Deferido por unanimidade em 25/9' (Acórdão 32909, vice Karen Fortes, cabe recurso)");
confere("registros deferidos no Radar atual", atual.justica.candidatos.filter((c) => c.registro?.situacao === "deferido").length, 16);
const deferidos = cands.length; // 16: os 15 do retrato + Laudicério (deferido em 25/9)

// palanques de 23 a 25/9 (só os apoios; mesmos dois grupos do original)
const grupo = (nome) => radar.grupos.grupos.find((g) => g.governador === nome);
const mov = (nome, data, re) => (grupo(nome)?.movimentos || []).find((m) => m.data === data && re.test(m.fato));
const mMauro = mov("Otaviano Pivetta", "2026-09-24", /Arrancada da Vitória.*Cuiabá.*Mauro Mendes pediu votos para Pivetta e para Margareth Buzetti ao Senado/);
const mPrefeitos = mov("Otaviano Pivetta", "2026-09-25", /videochamada, com Mauro Mendes, cem prefeitos que apoiam sua reeleição, segundo lista divulgada pela campanha/);
const mFlavio = mov("Wellington Fagundes", "2026-09-24", /Flávio Bolsonaro pediu votos para Wellington e para Zé Medeiros em vídeo; Sergio Moro declarou apoio a Wellington em 23\/9/);
if (!mMauro) erros.push("apoio de Mauro a Pivetta e Buzetti (24/9) não está no retrato");
if (!mPrefeitos) erros.push("lista de cem prefeitos (25/9) não está no retrato");
if (!mFlavio) erros.push("Flávio Bolsonaro e Sergio Moro (23 e 24/9) não estão no retrato");
const OUTROS = ["Doutora Natasha", "Maurício Coelho", "Rafaell Milas", "Sargento Laudicério"];
const naJanela = (g) => (g?.movimentos || []).filter((m) => m.data >= "2026-09-23" && m.data <= "2026-09-25").length;
confere("outros quatro grupos sem movimentos de 23 a 25/9", OUTROS.map((n) => naJanela(grupo(n))), [0, 0, 0, 0]);
const partido = (nome) => cands.find((c) => c.nome === nome)?.partido;
confere("partidos", ["Otaviano Pivetta", "Wellington Fagundes", "Mauro Mendes", "Margareth Buzetti", "Zé Medeiros", "Sargento Laudicério", ...OUTROS].map(partido),
  ["Republicanos", "PL", "União", "PP", "PL", "Agir", "PSD", "Mobiliza", "Missão", "Agir"]);
if (!JSON.stringify(radar).includes("Flávio Bolsonaro (PL)")) erros.push("partido de Flávio Bolsonaro (PL) não está no retrato");
if (erros.length) throw new Error("os dados não batem com a fala; ajuste antes de gerar:\n- " + erros.join("\n- "));

// informativo (não muda a fala, escopada em "desses casos" do Radar): decisões
// de 24 e 25/9 que só entraram no Radar depois do boletim
{
  const depois = new Map();
  for (const c of atual.justica.candidatos)
    for (const it of c.itens || [])
      if (["2026-09-24", "2026-09-25"].includes(it.data) && it.tipo === "decisao" && !recentes.some((x) => x.it.fontes.some((f) => it.fontes.some((g) => g[1] === f[1]))))
        depois.set(it.resumo, `${it.data} ${it.orgao} (fontes de ${[...new Set(it.fontes.map((f) => f[2]))].join(", ")})`);
  for (const v of depois.values()) console.log(`aviso: decisão de 24–25/9 que entrou no Radar depois do boletim: ${v}`);
}

// fontes das peças narradas (para a cartela final)
const fontesUsadas = new Map();
const soma = (fs) => fs.forEach(([n]) => fontesUsadas.set(n, (fontesUsadas.get(n) || 0) + 1));
recentes.forEach((x) => soma(x.it.fontes));
[mMauro, mPrefeitos, mFlavio].forEach((m) => soma(m.fontes));
soma(laudAtual.fontes || []);
const nomesFontes = (m) => [...new Set(m.fontes.map(([n]) => n.replace(/^Midiajur$/i, "MidiaJur")))];
const listaE = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}` : a.join(""));

// ------------------------------------------------------------ peças
// Cada peça leva data-c="k" (camada em que entra). Filhos herdam a camada do
// pai, salvo quando têm data-c próprio (ex.: barras dentro do cartão).
const c = (k) => `data-c="${k}"`;
const CAB = `<div class="p cab" ${c(0)}>RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>`;
const chip = (t) => `<div class="p" style="top:330px" ${c(0)}><span class="chip">${esc(t)}</span></div>`;
const coluna = (html, topo = 460) => `<div class="p" style="top:${topo}px">${html}</div>`;
const numero = (k, n, sub, extra = "") => `<div ${c(k)}><div class="grande">${n}</div><div class="sub">${esc(sub)}</div>${extra}</div>`;
const ficha = (k, t, mt = 26) => `<div class="ficha" ${c(k)} style="font-size:29px;margin-top:${mt}px">${esc(t)}</div>`;
const barra = (k, rot, n, max, cor = "") =>
  `<div class="row" ${c(k)}><div class="n">${esc(rot)}</div><div class="v">${n}</div><div class="t"><div class="f" style="width:${((n / max) * 100).toFixed(1)}%${cor ? `;background:${cor};box-shadow:none` : ""}"></div></div></div>`;
const cartao = (k, h3, corpo, mt = 34) => `<div class="card" ${c(k)} style="margin-top:${mt}px"><h3>${esc(h3)}</h3><div style="margin-top:10px">${corpo}</div></div>`;
const texto = (t, px = 40) => `<div class="sub" style="font-size:${px}px;color:#fff;font-weight:700">${t}</div>`;
const fichaCartao = (t) => `<div class="ficha" style="font-size:27px">${esc(t)}</div>`;
const nb = (t) => `<span style="white-space:nowrap">${t}</span>`;
const nome = (n, p) => `<div class="sub" style="font-size:50px;font-weight:800;color:#fff">${esc(n)} <span style="color:#9fb8ad;font-size:32px;font-weight:600">${esc(p)}</span></div>`;
const pills = (k, ...t) => `<div ${c(k)} style="margin-top:26px">${t.map((x) => `<span class="pill">${esc(x)}</span>`).join("")}</div>`;

const cenas = [];

// 2 — o total de casos no Radar e a situação deles
cenas.push({
  fala: "O Radar reúne oitenta e seis casos na Justiça Eleitoral com candidatos ao governo e ao Senado de Mato Grosso. São cinquenta e sete decisões, quinze ações ainda sem julgamento e catorze arquivadas.",
  movimento: "zoom-in",
  quando: [null, "cinquenta e sete", "quinze ações", "catorze"],
  html: CAB + chip("Justiça Eleitoral · até 26/9") + coluna(
    numero(0, N.total, "casos na Justiça Eleitoral com candidatos ao governo e ao Senado de MT") +
    cartao(0, "Situação dos casos",
      barra(1, "Decisões", N.decisao, N.total) +
      barra(2, "Ações ainda sem julgamento", N.andamento, N.total, "#8fe9c2") +
      barra(3, "Arquivadas", N.arquivada, N.total, "#6f8f83"), 40) +
    // a frase "cada caso foi conferido em fonte oficial ou em dois veículos", do
    // texto publicado, saiu: 2 dos 86 casos do retrato tinham um só veículo
    ficha(0, "Casos reunidos pelo Radar Eleitoral do HOJE MT até 26/9, às 05:50 (MT). As fontes de cada caso estão no Radar."),
  ),
});

// 3 — as decisões de 24 e 25/9 e quem estava na disputa
cenas.push({
  fala: "Dez desses casos são decisões tomadas pelo TRE de Mato Grosso em vinte e quatro e vinte e cinco de setembro, em disputas entre candidatos. Oito delas, entre candidatos ao Senado.",
  movimento: "zoom-out",
  quando: [null, "Oito delas"],
  html: CAB + chip("TRE-MT · 24 e 25/9") + coluna(
    numero(0, recentes.length, "decisões do TRE-MT em disputas entre candidatos", ficha(0, `Entre os ${N.total} casos reunidos pelo Radar até 26/9.`, 14)) +
    cartao(1, "As partes em disputa",
      `<div style="display:flex;gap:8px;height:96px;margin-top:14px">
        <div style="flex:${soSenado.length};border-radius:18px 0 0 18px;background:linear-gradient(90deg,#1baf7a,#2EDC8A);box-shadow:0 0 18px rgba(46,220,138,.6);display:flex;align-items:center;justify-content:center;font:800 52px Inter;color:#04150c">${soSenado.length}</div>
        <div style="flex:${comGoverno.length};border-radius:0 18px 18px 0;background:#8fe9c2;display:flex;align-items:center;justify-content:center;font:800 52px Inter;color:#04150c">${comGoverno.length}</div>
      </div>` +
      `<div class="sub" style="margin-top:26px;font-size:36px"><i style="display:inline-block;width:28px;height:28px;border-radius:7px;background:#2EDC8A;margin-right:16px;vertical-align:-3px"></i>${soSenado.length} entre candidatos ao Senado</div>` +
      `<div class="sub" style="margin-top:10px;font-size:36px"><i style="display:inline-block;width:28px;height:28px;border-radius:7px;background:#8fe9c2;margin-right:16px;vertical-align:-3px"></i>${comGoverno.length} com candidatos ao governo</div>`, 44) +
    ficha(1, "Cabe recurso nas 10 decisões. As partes e as fontes de cada caso estão na seção Justiça Eleitoral do Radar."),
  ),
});

// 4 — o que as dez decidiram e as multas
cenas.push({
  fala: "Cinco mandaram retirar vídeos ou publicações, três trataram de impulsionamento pago e duas deram direito de resposta. Houve três multas, de cinco mil a dez mil reais.",
  movimento: "pan-dir",
  quando: [null, "Cinco mandaram", "três trataram", "duas deram", "três multas"],
  html: CAB + chip(`${recentes.length} decisões de 24 e 25/9 no Radar`) + coluna(
    cartao(0, "O que o TRE-MT decidiu",
      barra(1, "Retirada de vídeos ou publicações", porTipo.retirada, recentes.length) +
      barra(2, "Impulsionamento pago", porTipo.impulsionamento, recentes.length) +
      barra(3, "Direito de resposta", porTipo.resposta, recentes.length), 0) +
    cartao(4, "Multas aplicadas",
      `<div style="display:flex;align-items:center;gap:40px;margin-top:6px"><span class="grande" style="font-size:170px">${multas.length}</span>` +
      `<span class="sub" style="font-size:50px;font-weight:800;color:#fff;line-height:1.2">de R$ ${Math.min(...multas)} mil<br>a R$ ${Math.max(...multas)} mil</span></div>` +
      fichaCartao("Cabe recurso. Partes e fontes de cada caso no Radar."), 40),
  ),
});

// 5 — o que é liminar e o que é ação em andamento
cenas.push({
  fala: "Liminar é decisão provisória e pode ser revista. E ação em andamento não é condenação.",
  movimento: "zoom-in",
  quando: [null, "ação em andamento"],
  html: CAB + chip("Para entender") + coluna(
    `<div class="tit" ${c(0)}>Liminar e ação<br><b>em andamento</b></div>` +
    cartao(0, "Liminar", texto("Decisão provisória, que pode ser revista", 46) + fichaCartao(`${liminares} das ${recentes.length} decisões de 24 e 25/9 reunidas pelo Radar eram liminares. Cabe recurso em todas.`), 56) +
    cartao(1, "Ação em andamento", texto("Não é condenação", 46) + fichaCartao(`${N.andamento} dos ${N.total} casos do Radar eram ações ainda sem julgamento.`), 40),
  ),
});

// 6 — registros: os 16 deferidos (correção: Laudicério deferido em 25/9)
cenas.push({
  fala: "Os dezesseis candidatos ao governo e ao Senado estão com registro deferido. O registro de Sargento Laudicério, candidato ao governo, foi deferido na sexta-feira, dia vinte e cinco. Cabe recurso.",
  movimento: "zoom-out",
  quando: [null, "Sargento Laudicério", "Cabe recurso"],
  html: CAB + chip("Registros de candidatura") + coluna(
    numero(0, deferidos, "candidatos ao governo e ao Senado de MT com registro deferido") +
    pills(0, "6 ao governo", "10 ao Senado") +
    cartao(1, "Governo · deferido em 25/9",
      nome("Sargento Laudicério", partido("Sargento Laudicério")) +
      fichaCartao("Decisão unânime do TRE-MT ao acolher embargos de declaração (Acórdão 32909). No mesmo dia, foi deferido o registro da vice, Sargento Karen Fortes."), 10) +
    `<div ${c(2)} style="margin-top:34px"><span class="chip">Cabe recurso</span></div>`,
  ),
});

// 7 — palanques: Otaviano Pivetta (ordem alfabética dos candidatos ao governo)
cenas.push({
  fala: "Nos palanques, entre vinte e três e vinte e cinco de setembro, Mauro Mendes pediu votos para Otaviano Pivetta e para Margareth Buzetti, e a campanha de Pivetta divulgou uma lista de cem prefeitos que apoiam a reeleição.",
  movimento: "pan-esq",
  quando: [null, "Mauro Mendes pediu", "a campanha de Pivetta"],
  html: CAB + chip("Nos palanques · 23 a 25/9") + coluna(
    `<div class="card" ${c(0)}>${nome("Otaviano Pivetta", partido("Otaviano Pivetta"))}<div class="ficha">Candidato ao governo · apoios anunciados de 23 a 25/9</div></div>` +
    cartao(1, "24/9 · Cuiabá",
      texto(`Mauro Mendes (${esc(partido("Mauro Mendes"))}) pediu votos para Pivetta e, ao Senado, para ${nb(`Margareth Buzetti (${esc(partido("Margareth Buzetti"))})`)}`) +
      fichaCartao("No ato “Arrancada da Vitória”")) +
    cartao(2, "25/9 · Videochamada",
      texto("A campanha divulgou uma lista de 100 prefeitos que apoiam a reeleição") +
      fichaCartao("Reunião de Pivetta e Mauro Mendes com os prefeitos")) +
    ficha(0, `Fontes: ${listaE([...new Set([...nomesFontes(mMauro), ...nomesFontes(mPrefeitos)])])}.`),
  ),
});

// 8 — palanques: Wellington Fagundes, e os grupos sem movimento no período
cenas.push({
  fala: "Flávio Bolsonaro pediu votos para Wellington Fagundes e para Zé Medeiros, e Sergio Moro declarou apoio a Wellington.",
  movimento: "zoom-in",
  quando: [null, "pediu votos", "Sergio Moro"],
  html: CAB + chip("Nos palanques · 23 a 25/9") + coluna(
    `<div class="card" ${c(0)}>${nome("Wellington Fagundes", partido("Wellington Fagundes"))}<div class="ficha">Candidato ao governo · apoios anunciados de 23 a 25/9</div></div>` +
    cartao(1, "24/9 · Em vídeo", texto(`Flávio Bolsonaro (PL) pediu votos para Wellington e, ao Senado, para ${nb(`Zé Medeiros (${esc(partido("Zé Medeiros"))})`)}`)) +
    cartao(2, "23/9 · Apoio", texto("Sergio Moro declarou apoio a Wellington")) +
    ficha(0, `Fontes: ${listaE(nomesFontes(mFlavio))}.`) +
    ficha(2, `${listaE(OUTROS.map((n) => `${n} (${partido(n)})`))} não tiveram movimentos novos registrados no Radar de 23 a 25/9.`, 18),
  ),
});

// todo `quando` tem de estar na fala (o charge-cena.mjs também confere), e a
// fala nunca cita avatar
for (const [i, cn] of cenas.entries()) {
  for (const q of cn.quando) if (q && !cn.fala.toLowerCase().includes(q.toLowerCase())) throw new Error(`cena ${i + 2}: trecho "${q}" não está na fala`);
  if (/\bargos\b|veredas|avatar/i.test(cn.fala + cn.html)) throw new Error(`cena ${i + 2}: cita avatar`);
}

// ------------------------------------------------------------ render
const LIM = { topo: 180, base: 1600, dir: 1080 - 40 };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const roteiro = [];
const previas = [];
for (const [i, cn] of cenas.entries()) {
  const k = i + 1; // arquivo <prefixo>-<k>-…, cena n = k + 1
  const arq = (suf) => `${PREFIXO}-${k}-${suf}.png`;
  const semente = k * 17 + 3;
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(semente)}</body></html>`);
  await page.screenshot({ path: join(OUT, arq("fundo")) });
  const camadas = cn.quando.map((_, j) => j);
  const usadas = new Set([...cn.html.matchAll(/data-c="(\d+)"/g)].map((m) => +m[1]));
  if (usadas.size !== camadas.length || camadas.some((j) => !usadas.has(j))) throw new Error(`cena ${k + 1}: camadas no HTML ${[...usadas]} × quando ${cn.quando.length}`);
  const lista = [];
  for (const j of camadas) {
    await page.setContent(`<!doctype html><html><head><style>${CSS}[data-c]{visibility:hidden}[data-c="${j}"]{visibility:visible}</style></head><body>${cn.html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(OUT, arq(`c${j}`)), omitBackground: true });
    lista.push({ imagem: `${PASTA}/cenas/${arq(`c${j}`)}`, ...(cn.quando[j] ? { quando: cn.quando[j] } : { em: 0 }) });
  }
  // prévia com tudo junto + conferência de área útil e de texto cortado
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(semente)}${cn.html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const caixa = await page.evaluate(() => {
    let topo = 1e9, base = 0, dir = 0;
    const cortes = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("svg")) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      topo = Math.min(topo, r.top); base = Math.max(base, r.bottom); dir = Math.max(dir, r.right);
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") cortes.push(el.className || el.tagName);
      if (el.matches(".card h3") && el.scrollHeight > el.clientHeight + 1) cortes.push("h3 em duas linhas: " + el.textContent);
    }
    return { topo: Math.round(topo), base: Math.round(base), dir: Math.round(dir), cortes };
  });
  if (caixa.topo < LIM.topo || caixa.base > LIM.base || caixa.dir > LIM.dir || caixa.cortes.length) throw new Error(`cena ${k + 1}: fora da área útil ou com texto cortado ${JSON.stringify(caixa)}`);
  const previa = join(PREVIA, `${k + 1}.png`);
  await page.screenshot({ path: previa });
  previas.push(previa);
  roteiro.push({ n: k + 1, quem: "narrador", fala: cn.fala, imagem: `${PASTA}/cenas/${arq("fundo")}`, movimento: cn.movimento, camadas: lista });
  console.log(`cena ${k + 1}: ${lista.length} camadas, conteúdo de y=${caixa.topo} a y=${caixa.base}`);
}

// montagem: intro + cenas 2–8 + fechamento (as prévias da intro e do
// fechamento são as gravadas pelos geradores deles no scratchpad)
const tiles = [join(SCRATCH, `${PREFIXO}-intro-previa.png`), ...previas, join(SCRATCH, `${PREFIXO}-fecho-previa.png`)].filter(existsSync);
const rot = (p) => (p.includes("intro") ? "1 · intro" : p.includes("fecho") ? `${cenas.length + 2} · fechamento` : `${p.match(/(\d+)\.png$/)[1]}`);
await page.setViewportSize({ width: 1800, height: 2 * 700 + 20 });
await page.setContent(`<!doctype html><html><head><style>${CSS}
html,body{width:1800px;height:auto;overflow:visible}body{background:#0b0f0d;display:grid;grid-template-columns:repeat(5,360px);gap:0}
figure{position:relative;width:360px;height:700px;margin:0}figure img{width:360px;height:640px;display:block}
figcaption{font:700 26px Inter;color:#8fe9c2;text-align:center;line-height:60px}</style></head><body>${tiles
  .map((p) => `<figure><img src="data:image/png;base64,${readFileSync(p).toString("base64")}"><figcaption>${esc(rot(p))}</figcaption></figure>`)
  .join("")}</body></html>`);
const montagem = join(SCRATCH, `${PREFIXO}-slides-montagem.png`);
await page.screenshot({ path: montagem, fullPage: true });
await browser.close();

writeFileSync(join(SCRATCH, "b2-slides-cenas.json"), JSON.stringify(roteiro, null, 1));
const palavras = cenas.reduce((s, cn) => s + cn.fala.trim().split(/\s+/).length, 0);
console.log(`${cenas.length} cenas, ${palavras} palavras de fala (sem intro e fechamento); casos ${JSON.stringify(N)}; 24–25/9: ${recentes.length} (${JSON.stringify(porTipo)}, Senado ${soSenado.length}, multas ${multas})`);
console.log(`fontes das peças narradas: ${[...fontesUsadas].sort((a, b) => b[1] - a[1]).map(([n, q]) => `${n} ${q}`).join(", ")}`);
console.log(`roteiro parcial: ${join(SCRATCH, "b2-slides-cenas.json")}; prévias: ${PREVIA}; montagem: ${montagem}`);
