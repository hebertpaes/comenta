// Gera os 3 quadros (1080×1920) do boletim em vídeo nº 2 (Justiça Eleitoral e
// apoios) a partir de content/paginas/radar-dados.json. Mesma moldura do nº 1
// (graficos-boletim.mjs), com o cabeçalho "RADAR ELEITORAL" (sem a assinatura
// do Argos desde 26/09: o boletim só noticia os fatos, sem se apresentar).
// Uso: node graficos-boletim-02.mjs [saida-dir]
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const SCRATCH = "/tmp/claude-0/-home-user-comenta/ff03d673-f500-59f9-930f-1d445e49d183/scratchpad";
const require = createRequire(join(SCRATCH, "pw", "package.json"));
const { chromium } = require("playwright-core");

const REPO = "/home/user/comenta/content";
const OUT = process.argv[2] || join(REPO, "pautas/videos/argos/cenas");
const PREFIXO = "2026-09-26-boletim-02";
mkdirSync(OUT, { recursive: true });

const radar = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8"));

const b64 = (p) => readFileSync(p).toString("base64");
const fontes = [400, 600, 700, 800]
  .map((w) => `@font-face{font-family:Inter;font-weight:${w};src:url(data:font/woff2;base64,${b64(join(SCRATCH, `fonts/inter-${w}.woff2`))}) format("woff2");}`)
  .join("\n");
const selo = `data:image/jpeg;base64,${b64(join(REPO, "pautas/videos/argos/argos-veredas-avatar-240.jpg"))}`;

const AQUA = "#1baf7a";
const AMARELO = "#eda100";
const CINZA = "#c9d0cc";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// ------------------------------------------------------------ números (do radar)
const casos = new Map();
for (const c of radar.justica.candidatos) {
  for (const it of c.itens) {
    const k = [it.data, it.orgao, it.resumo].join("|");
    if (!casos.has(k)) casos.set(k, { it, env: [] });
    casos.get(k).env.push(c);
  }
}
const lista = [...casos.values()];
const conta = (tipo) => lista.filter((x) => x.it.tipo === tipo).length;
const total = lista.length;
const decisoes = conta("decisao");
const andamento = conta("acao_em_andamento");
const arquivadas = conta("arquivada");
const candidatos = radar.justica.candidatos.length;
const deferidos = radar.justica.candidatos.filter((c) => c.registro.situacao === "deferido").length;
const pendentes = radar.justica.candidatos.filter((c) => c.registro.situacao !== "deferido");

const recentes = lista.filter((x) => ["2026-09-24", "2026-09-25"].includes(x.it.data) && x.it.tipo === "decisao");
const soSenado = recentes.filter((x) => x.env.every((c) => c.cargo === "senador")).length;
// Classificação das 10 decisões de 24–25/9 (lida caso a caso no radar em 26/9):
// retirada de vídeo/publicação 5, impulsionamento pago 3, direito de resposta 2.
const TIPOS = [
  ["Retirada de vídeos ou publicações", 5],
  ["Impulsionamento pago", 3],
  ["Direito de resposta", 2],
];
if (recentes.length !== TIPOS.reduce((s, [, n]) => s + n, 0)) {
  throw new Error(`o radar tem ${recentes.length} decisões em 24–25/9; revise a classificação`);
}

// ------------------------------------------------------------ moldura
const CSS = `
${fontes}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:Inter,sans-serif;background:#0a2e1f;color:#111;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column}
.topo{flex:none;background:#0a2e1f;color:#fff;padding:100px 64px 24px;position:relative}
.cab{display:flex;align-items:center;gap:24px;width:680px}
.selo{flex:none;width:112px;height:112px;border-radius:50%;border:5px solid ${AQUA};background:#0a2e1f url(${selo}) center/cover}
.assina .n{font-size:36px;font-weight:800;letter-spacing:1.5px;line-height:1.1}
.assina .r{font-size:23px;font-weight:700;letter-spacing:2.5px;color:#8fe0bd;margin-top:8px}
.titulo{margin-top:22px}
.titulo h1{font-size:56px;font-weight:800;line-height:1.08;letter-spacing:-0.5px}
.titulo .sub{font-size:25px;font-weight:500;color:#cfe9dd;margin-top:8px;line-height:1.3}
.miolo{flex:1;position:relative;background:#f6f8f7;padding:var(--pad-top,28px) 64px 0}
.fonte{position:absolute;left:64px;right:64px;bottom:16px;font-size:20px;color:#56615b;line-height:1.3}
.pe{flex:none;height:680px;background:#0a2e1f;border-top:6px solid ${AQUA}}
.caixa{background:#fff;border:2px solid #dfe5e2;border-radius:14px;padding:18px 24px 20px}
.rot{font-size:21px;font-weight:800;letter-spacing:1.5px;color:#0a2e1f}
`;

function pagina({ titulo, sub, miolo, fonte = "", padTop }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${CSS}</style></head>
<body style="${padTop != null ? `--pad-top:${padTop}px` : ""}">
<div class="topo">
  <div class="cab"><div class="assina"><div class="n">RADAR ELEITORAL</div><div class="r">HOJE MT · ELEIÇÕES 2026</div></div></div>
  <div class="titulo"><h1>${titulo}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>
</div>
<div class="miolo">${miolo}${fonte ? `<div class="fonte">${fonte}</div>` : ""}</div>
<div class="pe"></div>
</body></html>`;
}

// ------------------------------------------------------------ 4) quadro geral
const L = 952;
const gap = 4;
const fatia = (n) => (((L - 2 * gap) * n) / total).toFixed(1);
const segmentos = [
  [decisoes, "decisões", AQUA, "#0d1f16"],
  [andamento, "em andamento", AMARELO, "#0d1f16"],
  [arquivadas, "arquivadas", CINZA, "#3f4944"],
];
const g4 = pagina({
  titulo: "Justiça Eleitoral · quadro geral",
  sub: `${total} casos envolvendo os ${candidatos} candidatos ao governo e ao Senado de MT`,
  miolo: `
<div style="display:flex;gap:${gap}px;height:96px">
  ${segmentos
    .map(
      ([n, , cor, tinta], i) =>
        `<div style="width:${fatia(n)}px;background:${cor};${i === 0 ? "border-radius:10px 0 0 10px;" : ""}${i === 2 ? "border-radius:0 10px 10px 0;" : ""}display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:${tinta}">${n}</div>`,
    )
    .join("")}
</div>
<div style="display:flex;justify-content:space-between;margin-top:18px">
  ${segmentos
    .map(
      ([n, rot, cor]) =>
        `<div style="display:flex;align-items:center;gap:12px;font-size:28px;font-weight:700"><i style="display:inline-block;width:26px;height:26px;border-radius:6px;background:${cor}"></i>${n} ${rot}</div>`,
    )
    .join("")}
</div>
<div class="caixa" style="margin-top:40px">
  <div class="rot">REGISTROS DE CANDIDATURA</div>
  <div style="font-size:34px;font-weight:800;margin-top:10px">${deferidos} deferidos · ${pendentes.length} aguardando julgamento</div>
  <div style="font-size:24px;color:#3a4540;margin-top:8px;line-height:1.3">${pendentes.map((c) => `${esc(c.nome)} (${c.cargo === "governador" ? "governo" : "Senado"})`).join(", ")}</div>
</div>
<div style="font-size:24px;font-weight:700;color:#0a2e1f;margin-top:28px;line-height:1.35">Decisão liminar pode ser revista.<br>Ação em andamento não é condenação.</div>`,
  fonte: "Cada caso conferido em fonte oficial (TRE-MT/TSE) ou em 2 veículos. Lista completa, com links, no Radar Eleitoral do HOJE MT.",
});

// ------------------------------------------------------------ 5) 24 e 25/9
const maxT = Math.max(...TIPOS.map(([, n]) => n));
const areaT = 560;
const g5 = pagina({
  titulo: "TRE-MT · 24 e 25/9",
  sub: `${recentes.length} decisões em disputas entre candidatos`,
  miolo: `
${TIPOS.map(
  ([rot, n], i) => `<div style="margin-top:${i ? 26 : 4}px">
  <div style="font-size:28px;font-weight:700">${rot}</div>
  <div style="display:flex;align-items:center;gap:16px;margin-top:8px">
    <div style="width:${((n / maxT) * areaT).toFixed(1)}px;height:56px;background:${AQUA};border-radius:0 8px 8px 0"></div>
    <span style="font-size:40px;font-weight:800">${n}</span>
  </div></div>`,
).join("")}
<div class="caixa" style="margin-top:40px">
  <div style="font-size:32px;font-weight:800">${soSenado} das ${recentes.length} em disputas entre candidatos ao Senado</div>
  <div style="font-size:26px;color:#3a4540;margin-top:10px">3 multas, de R$ 5 mil a R$ 10 mil · cabe recurso</div>
</div>`,
  fonte: "Fontes: Olhar Direto, MidiaNews, MidiaJur, Folhamax, 24 Horas MT, Infoverus e outros veículos (2 por caso). Detalhes no Radar Eleitoral do HOJE MT.",
});

// ------------------------------------------------------------ 8) palanques
const grupo = (nome) => radar.grupos.grupos.find((g) => g.governador === nome);
const TEXTO = {
  // resumos curtos dos "fato" do radar (mesmas fontes)
  "2026-09-25|Otaviano Pivetta": "Com Mauro Mendes, reuniu por videochamada 100 prefeitos que apoiam a reeleição, segundo lista da campanha",
  "2026-09-24|Otaviano Pivetta": "Mauro Mendes pediu votos para Pivetta e para Margareth Buzetti (Senado)",
  "2026-09-24|Wellington Fagundes": "Flávio Bolsonaro pediu votos para Wellington e para Zé Medeiros (Senado); em 23/9, Sergio Moro declarou apoio",
};
// só os apoios de 23 a 25/9 (o quadro é sobre apoios; os demais movimentos ficam no radar)
const movs = (g) => g.movimentos.filter((m) => m.data >= "2026-09-23" && TEXTO[`${m.data}|${g.governador}`]);
const dm = (d) => `${+d.slice(8, 10)}/${+d.slice(5, 7)}`;
const bloco = (nome) => {
  const g = grupo(nome);
  const itens = movs(g)
    .map((m) => {
      const t = TEXTO[`${m.data}|${nome}`];
      if (!t) throw new Error(`sem resumo para ${m.data} ${nome}`);
      return `<div style="display:flex;gap:16px;margin-top:14px"><span style="flex:none;font-size:24px;font-weight:800;color:#0a2e1f;width:70px">${dm(m.data)}</span><span style="font-size:26px;line-height:1.3">${esc(t)}</span></div>`;
    })
    .join("");
  return `<div class="caixa" style="margin-top:24px"><div class="rot">${esc(nome.toUpperCase())} · ${esc(g.partido)}</div>${itens}</div>`;
};
const g8 = pagina({
  titulo: "Nos palanques",
  sub: "Apoios anunciados de 23 a 25/9 · ordem alfabética",
  padTop: 8,
  miolo: `${bloco("Otaviano Pivetta")}${bloco("Wellington Fagundes")}`,
  fonte: "Fontes: Olhar Direto, MidiaJur, Infoverus, RDM Online, O Documento, Gazeta Digital. Movimentos de todos os grupos no Radar Eleitoral do HOJE MT.",
});

// ------------------------------------------------------------ render
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const htmlDir = join(SCRATCH, "argos-b2");
mkdirSync(htmlDir, { recursive: true });
for (const [n, html] of [
  [4, g4],
  [5, g5],
  [8, g8],
]) {
  writeFileSync(join(htmlDir, `grafico-${n}.html`), html);
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const info = await page.evaluate(() => {
    const miolo = document.querySelector(".miolo");
    let maxBottom = 0;
    for (const el of miolo.querySelectorAll("*")) {
      if (el.closest(".fonte")) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) maxBottom = Math.max(maxBottom, r.bottom);
    }
    const f = document.querySelector(".fonte");
    return { mioloTop: Math.round(miolo.getBoundingClientRect().top), conteudoBottom: Math.round(maxBottom), fonteTop: f && Math.round(f.getBoundingClientRect().top), peTop: Math.round(document.querySelector(".pe").getBoundingClientRect().top) };
  });
  const arq = join(OUT, `${PREFIXO}-${n}.jpg`);
  await page.screenshot({ path: arq, type: "jpeg", quality: 92 });
  console.log(n, arq, JSON.stringify(info));
}
console.log(JSON.stringify({ total, decisoes, andamento, arquivadas, candidatos, deferidos, pendentes: pendentes.map((c) => c.nome), recentes: recentes.length, soSenado }));
await browser.close();
