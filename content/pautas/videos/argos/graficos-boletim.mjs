// Gera os 4 gráficos (1080×1920) do Boletim do Argos nº 1 a partir de
// content/paginas/radar-dados.json. Uso: node graficos.mjs [saida-dir]
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const SCRATCH = "/tmp/claude-0/-home-user-comenta/ff03d673-f500-59f9-930f-1d445e49d183/scratchpad";
const require = createRequire(join(SCRATCH, "pw", "package.json"));
const { chromium } = require("playwright-core");

const REPO = "/home/user/comenta/content";
const OUT = process.argv[2] || join(REPO, "pautas/videos/argos/cenas");
const PREFIXO = "2026-09-26-boletim-01";
mkdirSync(OUT, { recursive: true });

const dados = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8")).pesquisas;
const corrida = (id) => dados.corridas.find((c) => c.id === id);
const gov = corrida("governador-mt");
const sen = corrida("senado-mt");
const pres = corrida("presidente");

const b64 = (p) => readFileSync(p).toString("base64");
const fontes = [400, 600, 700, 800]
  .map((w) => `@font-face{font-family:Inter;font-weight:${w};src:url(data:font/woff2;base64,${b64(join(SCRATCH, `fonts/inter-${w}.woff2`))}) format("woff2");}`)
  .join("\n");
const selo = `data:image/jpeg;base64,${b64(join(REPO, "pautas/videos/argos/argos-veredas-avatar-240.jpg"))}`;

const AQUA = "#1baf7a";
const AMARELO = "#eda100";
const AZUL = "#2a78d6";
const LARANJA = "#eb6834";
const CINZA = "#c9d0cc";

// ------------------------------------------------------------ formatação
const decimais = (p) => Object.values(p.v || {}).some((x) => !Number.isInteger(x)) || (p.t2 || []).flat().some((x) => typeof x === "number" && !Number.isInteger(x));
const num = (x, dec) => (dec ? x.toFixed(1) : String(Math.round(x))).replace(".", ",");
const campo = (c) => {
  const m = c.match(/^(\d+) a (\d+)\/(\d+)$/);
  return m ? `${+m[1]}–${+m[2]}/${+m[3]}` : c;
};
const registro = (r, uf = "MT") => {
  const partes = r.split(/\s*,\s*/);
  return partes.find((x) => x.startsWith(uf + "-")) || partes[0];
};
const ficha = (p, { uf = "MT", reg } = {}) =>
  `<b>${p.inst}</b> · ${campo(p.campo)} · ${p.amostra} entrevistas · ±${p.margem} · ${reg || registro(p.reg, uf)}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

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
.chaves{display:flex;flex-wrap:wrap;gap:10px 30px;margin-top:12px;font-size:25px;font-weight:600;color:#fff}
.chaves span{display:inline-flex;align-items:center;gap:10px}
.chaves i{display:inline-block;width:24px;height:24px;border-radius:5px}
.miolo{flex:1;position:relative;background:#f6f8f7;padding:var(--pad-top,24px) 64px 0}
.fonte{position:absolute;left:64px;right:64px;bottom:16px;font-size:20px;color:#56615b;line-height:1.3}
.pe{flex:none;height:680px;background:#0a2e1f;border-top:6px solid ${AQUA}}
.ficha{font-size:23px;color:#3a4540;line-height:1.25;white-space:nowrap;display:flex;align-items:center;gap:12px}
.ficha b{color:#111;font-weight:800}
.tag{font-size:19px;font-weight:700;color:#0a2e1f;background:#d6efe4;border-radius:20px;padding:3px 12px;letter-spacing:.3px}
.linha{display:flex;align-items:center}
.nm{width:var(--nm,170px);font-size:26px;font-weight:600;color:#111;flex:none}
.area{position:relative;width:var(--area,680px);height:var(--bh,40px)}
.bar{position:absolute;left:0;top:0;height:100%;border-radius:0 6px 6px 0}
.v{position:absolute;top:50%;transform:translateY(-50%);font-size:28px;font-weight:800;color:#111;white-space:nowrap}
.grade{position:absolute;top:0;bottom:0;width:0;border-left:2px dashed #dfe5e2}
`;

function pagina({ titulo, sub, chaves = [], miolo, fonte = "", padTop }) {
  const ch = chaves.length
    ? `<div class="chaves">${chaves.map(([cor, txt]) => `<span><i style="background:${cor}"></i>${esc(txt)}</span>`).join("")}</div>`
    : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${CSS}</style></head>
<body style="${padTop != null ? `--pad-top:${padTop}px` : ""}">
<div class="topo">
  <div class="cab"><div class="selo"></div><div class="assina"><div class="n">ARGOS VEREDAS</div><div class="r">REPÓRTER VIRTUAL (IA)</div></div></div>
  <div class="titulo"><h1>${titulo}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}${ch}</div>
</div>
<div class="miolo">${miolo}${fonte ? `<div class="fonte">${fonte}</div>` : ""}</div>
<div class="pe"></div>
</body></html>`;
}

// barras horizontais pareadas; escala 0–max
function pares(lista, { nomes, cores, max = 50, area = 680, bh = 40, gapBar = 6, gapLinha = 20, nm = 170, tags = {}, fs = 23, vfs = 28, nfs = 26 }) {
  const px = (x) => (x / max) * area;
  return lista
    .map((p, i) => {
      const dec = decimais(p);
      const barras = nomes
        .map(([chave, rotulo], k) => {
          const val = p.v[chave];
          return `<div class="linha" style="margin-top:${k ? gapBar : 6}px"><div class="nm" style="font-size:${nfs}px">${rotulo}</div><div class="area">
  <div class="bar" style="width:${px(val).toFixed(1)}px;background:${cores[k]}"></div>
  <span class="v" style="font-size:${vfs}px;left:${(px(val) + 12).toFixed(1)}px">${num(val, dec)}%</span></div></div>`;
        })
        .join("");
      const tag = tags[i] ? `<span class="tag">${tags[i]}</span>` : "";
      return `<div style="margin-top:${i ? gapLinha : 0}px;--nm:${nm}px;--area:${area}px;--bh:${bh}px"><div class="ficha" style="font-size:${fs}px"><span>${ficha(p, { uf: p.uf || "MT" })}</span>${tag}</div>${barras}</div>`;
    })
    .join("");
}

// ------------------------------------------------------------ 2) governo, 1º turno
const govT1 = gov.pesquisas; // já do mais recente para o mais antigo
const vs = (p) => [p.v["Otaviano Pivetta"], p.v["Wellington Fagundes"]];
const empate = (a, b, m) => Math.abs(a - b) <= 2 * Number(String(m).replace(",", "."));
const tagsGov = {};
govT1.forEach((p, i) => {
  const [a, b] = vs(p);
  if (empate(a, b, p.margem)) tagsGov[i] = "empate técnico";
});
const g2 = pagina({
  titulo: "Governo de MT · 1º turno",
  sub: "Intenção de voto estimulada, % do total · 5 pesquisas desde 4/9",
  chaves: [
    [AQUA, "Otaviano Pivetta (Republicanos)"],
    [AMARELO, "Wellington Fagundes (PL)"],
  ],
  miolo: `<div style="position:relative">${pares(govT1, {
    nomes: [
      ["Otaviano Pivetta", "Pivetta"],
      ["Wellington Fagundes", "Wellington"],
    ],
    cores: [AQUA, AMARELO],
    bh: 40,
    gapLinha: 26,
    tags: tagsGov,
  })}</div>`,
  fonte: "Escala 0–50%. Empate técnico: diferença até 2× a margem de erro. Fontes: institutos e registros na Justiça Eleitoral (PesqEle/TSE). Fichas completas no Radar Eleitoral do HOJE MT.",
});

// ------------------------------------------------------------ 3) governo, 2º turno
function divididas(lista) {
  const L = 952;
  return lista
    .map((p, i) => {
      const [[n1, v1, n2, v2]] = p.t2;
      const dec = decimais(p);
      const cor = (n) => (n.startsWith("Otaviano") ? AQUA : AMARELO);
      const curto = (n) => (n.startsWith("Otaviano") ? "Pivetta" : "Wellington");
      const resto = +(100 - v1 - v2).toFixed(1);
      const gap = 4;
      const w1 = ((v1 / 100) * (L - 2 * gap)).toFixed(1);
      const w2 = ((v2 / 100) * (L - 2 * gap)).toFixed(1);
      const w3 = ((resto / 100) * (L - 2 * gap)).toFixed(1);
      return `<div style="margin-top:${i ? 30 : 0}px">
  <div class="ficha"><span>${ficha(p)}</span></div>
  <div style="display:flex;gap:${gap}px;margin-top:10px;height:66px">
    <div style="width:${w1}px;background:${cor(n1)};border-radius:8px 0 0 8px;display:flex;align-items:center;padding-left:18px;font-size:29px;font-weight:800;color:#0d1f16;white-space:nowrap">${curto(n1)} ${num(v1, dec)}%</div>
    <div style="width:${w3}px;background:${CINZA};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#3f4944">${num(resto, dec)}%</div>
    <div style="width:${w2}px;background:${cor(n2)};border-radius:0 8px 8px 0;display:flex;align-items:center;justify-content:flex-end;padding-right:18px;font-size:29px;font-weight:800;color:#0d1f16;white-space:nowrap">${curto(n2)} ${num(v2, dec)}%</div>
  </div></div>`;
    })
    .join("");
}
const g3 = pagina({
  titulo: "Governo de MT · 2º turno",
  sub: "Pivetta x Wellington, % do total · quem está à frente fica à esquerda",
  chaves: [
    [AQUA, "Pivetta"],
    [AMARELO, "Wellington"],
    [CINZA, "brancos, nulos e indecisos"],
  ],
  miolo: divididas(gov.pesquisas),
  fonte: "Fontes: institutos e registros na Justiça Eleitoral (PesqEle/TSE). Fichas completas no Radar Eleitoral do HOJE MT.",
  padTop: 34,
});

// ------------------------------------------------------------ 4) Senado, 1º voto
const quaestSen = sen.pesquisas.find((p) => p.inst === "Quaest");
const paranaSen = sen.pesquisas.find((p) => p.inst === "Paraná Pesquisas" && p.campo === "15 a 17/09");
const mtdSen = sen.pesquisas.find((p) => p.inst === "MT Dados");
const partidos = { "Mauro Mendes": "União", "Janaina Riva": "MDB", "Zé Medeiros": "PL", "Pedro Taques": "PSB", "Fávaro": "PSD" };
const ordemSen = ["Mauro Mendes", "Janaina Riva", "Zé Medeiros", "Pedro Taques", "Fávaro"];
const barrasSen = ordemSen
  .map((n, i) => {
    const val = quaestSen.v[n];
    const area = 560;
    const w = (val / 50) * area;
    return `<div class="linha" style="margin-top:${i ? 20 : 18}px;--nm:290px;--area:${area}px;--bh:64px">
  <div class="nm" style="line-height:1.1">${n}<div style="font-size:20px;font-weight:500;color:#56615b;margin-top:2px">${partidos[n]}</div></div>
  <div class="area"><div class="bar" style="width:${w.toFixed(1)}px;background:${AQUA}"></div><span class="v" style="left:${(w + 12).toFixed(1)}px">${num(val, false)}%</span></div></div>`;
  })
  .join("");
const outra = (p) => {
  const dec = decimais(p);
  return `<div style="margin-top:14px"><div class="ficha" style="font-size:22px"><span>${ficha(p)}</span></div>
  <div style="font-size:30px;font-weight:700;margin-top:6px">Mauro ${num(p.v["Mauro Mendes"], dec)}% · Janaina ${num(p.v["Janaina Riva"], dec)}%</div></div>`;
};
const g4 = pagina({
  titulo: "Senado · 1º voto",
  sub: "2 vagas: cada eleitor vota em 2 nomes · % do total no 1º voto",
  miolo: `<div class="ficha"><span>${ficha(quaestSen)}</span><span class="tag">mais recente</span></div>${barrasSen}
<div style="margin-top:40px;background:#fff;border:2px solid #dfe5e2;border-radius:14px;padding:18px 24px 22px">
  <div style="font-size:21px;font-weight:800;letter-spacing:1.5px;color:#0a2e1f">OUTRAS PESQUISAS · 1º VOTO</div>
  ${outra(paranaSen)}${outra(mtdSen)}
</div>`,
  fonte: "Soma dos 2 votos e demais nomes no Radar Eleitoral do HOJE MT. Fontes: institutos e registros na Justiça Eleitoral (PesqEle/TSE).",
});

// ------------------------------------------------------------ 5) Presidência
const nacionais = pres.pesquisas.slice(0, 6).map((p) => ({ ...p, uf: "BR" }));
const restantes = pres.pesquisas.length - nacionais.length;
const g5 = pagina({
  titulo: "Presidência · 1º turno",
  sub: `As 6 pesquisas nacionais mais recentes, % do total`,
  chaves: [
    [AZUL, "Lula (PT)"],
    [LARANJA, "Flávio Bolsonaro (PL)"],
  ],
  padTop: 18,
  miolo: `<div>${pares(nacionais, {
    nomes: [
      ["Lula", "Lula"],
      ["Flávio Bolsonaro", "Flávio"],
    ],
    cores: [AZUL, LARANJA],
    bh: 26,
    gapBar: 3,
    gapLinha: 14,
    area: 760,
    nm: 100,
    fs: 22,
    vfs: 26,
    nfs: 24,
  })}</div>
<div style="font-size:22px;font-weight:700;color:#0a2e1f;margin-top:12px">E mais ${restantes} pesquisas nacionais no Radar Eleitoral do HOJE MT</div>
<div style="margin-top:14px;background:#0a2e1f;border-radius:14px;padding:14px 24px 16px;color:#fff">
  <div style="display:flex;align-items:baseline;gap:18px;flex-wrap:wrap">
    <span style="font-size:24px;font-weight:800;letter-spacing:1.5px;color:#8fe0bd">EM MATO GROSSO</span>
    <span style="font-size:36px;font-weight:800"><i style="display:inline-block;width:22px;height:22px;border-radius:5px;background:${LARANJA};margin-right:8px"></i>Flávio 50% · <i style="display:inline-block;width:22px;height:22px;border-radius:5px;background:${AZUL};margin-right:8px"></i>Lula 25%</span>
  </div>
  <div style="font-size:21px;color:#cfe9dd;margin-top:6px">Quaest · 21–24/9 · 804 entrevistas · ±3 · MT-08098/2026 e BR-09594/2026</div>
</div>`,
});

// ------------------------------------------------------------ render
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const htmlDir = join(SCRATCH, "argos-b1");
const { writeFileSync } = await import("node:fs");
for (const [n, html] of [
  [2, g2],
  [3, g3],
  [4, g4],
  [5, g5],
]) {
  writeFileSync(join(htmlDir, `grafico-${n}.html`), html);
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // medições para checar transbordo
  const info = await page.evaluate(() => {
    const miolo = document.querySelector(".miolo");
    const mb = miolo.getBoundingClientRect();
    let maxBottom = 0, maxRight = 0, minLeft = 1080;
    for (const el of miolo.querySelectorAll("*")) {
      if (el.closest(".fonte")) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) { maxBottom = Math.max(maxBottom, r.bottom); maxRight = Math.max(maxRight, r.right); minLeft = Math.min(minLeft, r.left); }
    }
    // texto que transborda a própria caixa
    const transb = [...document.querySelectorAll("div,span")].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible").length;
    const f = document.querySelector(".fonte");
    const fr = f ? f.getBoundingClientRect() : null;
    const pe = document.querySelector(".pe").getBoundingClientRect();
    const cab = document.querySelector(".cab").getBoundingClientRect();
    return { mioloTop: Math.round(mb.top), conteudoBottom: Math.round(maxBottom), fonteTop: fr && Math.round(fr.top), peTop: Math.round(pe.top), conteudoRight: Math.round(maxRight), minLeft: Math.round(minLeft), cabRight: Math.round(cab.right), transb };
  });
  const arq = join(OUT, `${PREFIXO}-${n}.jpg`);
  await page.screenshot({ path: arq, type: "jpeg", quality: 92 });
  console.log(n, arq, JSON.stringify(info));
}
await browser.close();
