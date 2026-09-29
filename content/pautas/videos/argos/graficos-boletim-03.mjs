// Slides (1080×1920) do boletim em vídeo nº 3 — formato "só voz e slides"
// (editor, 29/09: "Não deixe avatar. Deixe somente a voz e slides" e "crie
// slides no estilo deste vídeo [youtu.be/M6jemlgwZxU] e somente com narrador e
// slides em tempo real"). Do vídeo de referência vem só o ESTILO VISUAL (fundo
// escuro com ondas e curvas de nível, chips de texto com brilho, cartões de
// vidro); o narrador dele não é imitado.
//
// Para cada cena gera:
//   <prefixo>-<n>-fundo.png   fundo (a câmera do charge-cena anda sobre ele)
//   <prefixo>-<n>-c<k>.png    camadas transparentes que entram junto com a fala
// e escreve o roteiro <prefixo>.cena.json com `camadas` ({imagem, quando}).
// Números: content/paginas/radar-dados.json (pesquisas registradas).
// Uso: node graficos-boletim-03.mjs
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const SCRATCH = "/tmp/claude-0/-home-user-comenta/ff03d673-f500-59f9-930f-1d445e49d183/scratchpad";
const require = createRequire(join(SCRATCH, "pw", "package.json"));
const { chromium } = require("playwright-core");

const REPO = "/home/user/comenta/content";
const PASTA = "pautas/videos/argos";
const OUT = join(REPO, PASTA, "cenas");
const PREFIXO = "2026-09-29-boletim-03";
mkdirSync(OUT, { recursive: true });

const radar = JSON.parse(readFileSync(join(REPO, "paginas/radar-dados.json"), "utf8"));
const [gov, sen] = radar.pesquisas.corridas;
const achar = (c, inst, reg) => c.pesquisas.find((q) => q.inst === inst && q.reg.includes(reg));
const qGov = achar(gov, "Quaest", "MT-08098");
const vGov = achar(gov, "Veritá", "MT-09975");
const qSen = achar(sen, "Quaest", "MT-08098");
if (!qGov || !vGov || !qSen) throw new Error("pesquisa não encontrada no radar");

const b64 = (p) => readFileSync(p).toString("base64");
const fontes = [400, 600, 700, 800]
  .map((w) => `@font-face{font-family:Inter;font-weight:${w};src:url(data:font/woff2;base64,${b64(join(SCRATCH, `fonts/inter-${w}.woff2`))}) format("woff2");}`)
  .join("\n");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const pct = (v) => String(v).replace(".", ",") + "%";

// ------------------------------------------------------------ fundo
// ondas escuras "de seda" + curvas de nível em verde-água, variando por cena
function fundo(semente) {
  let s = semente * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const ondas = [];
  for (let i = 0; i < 7; i++) {
    const y0 = 200 + i * 260 + rnd() * 120;
    const a = 80 + rnd() * 140, f = 1.2 + rnd() * 1.6, fase = rnd() * 6.28;
    let d = `M -100 ${y0}`;
    for (let x = -100; x <= 1180; x += 30) d += ` L ${x} ${(y0 + a * Math.sin((x / 1080) * f * 6.28 + fase)).toFixed(1)}`;
    ondas.push(`<path d="${d}" stroke="url(#g${i % 2})" stroke-width="${90 + rnd() * 120}" fill="none" opacity="${(0.18 + rnd() * 0.2).toFixed(2)}" filter="url(#b)"/>`);
  }
  const curvas = [];
  const cx = 200 + rnd() * 680, cy = 500 + rnd() * 900;
  for (let r = 60; r < 1500; r += 46) {
    let d = "";
    for (let k = 0; k <= 72; k++) {
      const t = (k / 72) * 6.2832;
      const rr = r * (1 + 0.16 * Math.sin(3 * t + r / 180) + 0.08 * Math.sin(5 * t + r / 90));
      d += `${k ? "L" : "M"} ${(cx + rr * Math.cos(t)).toFixed(1)} ${(cy + rr * 1.25 * Math.sin(t)).toFixed(1)} `;
    }
    curvas.push(`<path d="${d}Z" stroke="#2EDC8A" stroke-width="1.6" fill="none" opacity="${(0.05 + 0.10 * Math.exp(-r / 700)).toFixed(3)}"/>`);
  }
  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0">
<defs><linearGradient id="g0" x1="0" x2="1"><stop offset="0" stop-color="#0d3b2c"/><stop offset=".5" stop-color="#1c5a47"/><stop offset="1" stop-color="#0a2a20"/></linearGradient>
<linearGradient id="g1" x1="0" x2="1"><stop offset="0" stop-color="#123a3a"/><stop offset=".6" stop-color="#27665a"/><stop offset="1" stop-color="#0b2422"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="38"/></filter>
<radialGradient id="luz" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#0f261f"/><stop offset="1" stop-color="#030605"/></radialGradient></defs>
<rect width="1080" height="1920" fill="url(#luz)"/>${ondas.join("")}${curvas.join("")}
<rect width="1080" height="1920" fill="#000" opacity=".18"/></svg>`;
}

// ------------------------------------------------------------ peças
const CSS = `${fontes}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;background:transparent;font-family:Inter,sans-serif;color:#fff;overflow:hidden}
.p{position:absolute;left:70px;right:70px}
.cab{top:196px;font:700 25px Inter;letter-spacing:.2em;color:#8fe9c2;text-shadow:0 0 12px rgba(46,220,138,.55)}
.chip{display:inline-block;border:2px solid #2EDC8A;border-radius:999px;padding:14px 32px;font:800 36px Inter;letter-spacing:.04em;text-transform:uppercase;color:#e7fff4;background:rgba(6,30,22,.62);box-shadow:0 0 22px rgba(46,220,138,.55),inset 0 0 14px rgba(46,220,138,.22);text-shadow:0 0 12px rgba(46,220,138,.9)}
.tit{font:800 76px/1.06 Inter;letter-spacing:-.01em;text-shadow:0 4px 30px rgba(0,0,0,.6)}
.tit b{color:#2EDC8A;text-shadow:0 0 24px rgba(46,220,138,.6)}
.sub{font:600 38px/1.3 Inter;color:#cfe9dd}
.card{background:rgba(8,20,16,.80);border:2px solid rgba(46,220,138,.8);border-radius:38px;padding:40px 44px;box-shadow:0 0 44px rgba(46,220,138,.32),inset 0 0 30px rgba(46,220,138,.08)}
.card h3{font:800 34px/60px Inter;height:60px;letter-spacing:.06em;color:#8fe9c2;text-transform:uppercase;text-shadow:0 0 12px rgba(46,220,138,.5)}
.lay{padding:40px 44px;border:2px solid transparent}
.row{height:104px;position:relative}
.row .n{font:700 36px Inter;color:#fff}
.row .n i{font-style:normal;font-weight:600;color:#9fb8ad;font-size:28px;margin-left:10px}
.row .v{position:absolute;right:0;top:0;font:800 42px Inter;color:#fff}
.row .t{position:absolute;left:0;right:0;top:54px;height:26px;border-radius:13px;background:rgba(255,255,255,.08)}
.row .f{height:100%;border-radius:13px;background:linear-gradient(90deg,#1baf7a,#2EDC8A);box-shadow:0 0 18px rgba(46,220,138,.7)}
.row.pq{height:76px}.row.pq .n{font-size:30px}.row.pq .v{font-size:32px}.row.pq .t{top:42px;height:18px}
.ficha{font:500 25px/1.4 Inter;color:#9fb8ad;margin-top:18px}
.grande{font:800 210px/1 Inter;color:#2EDC8A;text-shadow:0 0 50px rgba(46,220,138,.7)}
.pill{display:inline-block;border:2px solid rgba(143,233,194,.7);border-radius:22px;padding:18px 28px;font:700 40px Inter;color:#e7fff4;background:rgba(6,30,22,.6);box-shadow:0 0 20px rgba(46,220,138,.35);margin:0 14px 18px 0}
`;

function barras(v, nomes, { max = 50, pq = false, partidos = {} } = {}) {
  return nomes.map((n) => {
    const x = v[n] ?? 0;
    return `<div class="row${pq ? " pq" : ""}" data-k="${esc(n)}"><div class="n">${esc(n)}${partidos[n] ? `<i>${esc(partidos[n])}</i>` : ""}</div><div class="v">${pct(x)}</div><div class="t"><div class="f" style="width:${Math.max(0.6, (x / max) * 100).toFixed(1)}%"></div></div></div>`;
  });
}
const ficha = (q, extra = "") =>
  `${esc(q.inst)} · ${q.contratante === "recursos próprios" ? "recursos próprios" : "contratada por " + esc(q.contratante)} · ${esc(q.amostra)} entrevistas${q.metodo ? " " + esc(q.metodo) + "s" : ""} · ${esc(q.campo)} · margem de ${esc(q.margem)} pontos · confiança de ${q.conf || 95}% · registro ${esc(q.reg)}${extra}`;

const PART = { "Otaviano Pivetta": "Republicanos", "Wellington Fagundes": "PL", "Doutora Natasha": "PSD", "Sargento Laudicério": "Agir", "Maurício Coelho": "Mobiliza", "Rafaell Milas": "Missão" };
const GOV6 = ["Otaviano Pivetta", "Wellington Fagundes", "Doutora Natasha", "Sargento Laudicério", "Maurício Coelho", "Rafaell Milas"];
// linha k de barras numa camada, alinhada com o cartão (mesmo topo, borda e padding)
const lay = (k, alt, html, topo = 480) => `<div class="p lay" style="top:${topo}px"><div style="height:${60 + k * alt}px"></div>${html}</div>`;
const resto = (k, alt, html) => `<div style="position:absolute;left:44px;right:44px;top:${100 + k * alt}px">${html}</div>`;
const ordena = (v, nomes) => [...nomes].sort((a, b) => (v[b] ?? 0) - (v[a] ?? 0) || a.localeCompare(b, "pt"));

// ------------------------------------------------------------ cenas
// cada peça: [camada, html]; camada 0 entra no início da cena, as outras quando
// o narrador chega ao trecho `quando` (charge-cena.mjs, campo `camadas`)
const CAB = `<div class="p cab">RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>`;
const cenas = [];

// 1 — abertura da notícia
cenas.push({
  fala: "Duas novas pesquisas registradas mostram Otaviano Pivetta e Wellington Fagundes nos dois primeiros lugares na disputa pelo governo de Mato Grosso.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB + `<div class="p" style="top:330px"><span class="chip">Governo de MT</span></div><div class="p tit" style="top:470px">Duas novas<br>pesquisas<br><b>registradas</b></div>`],
    [1, `<div class="p card" style="top:900px"><h3>Nos dois primeiros lugares</h3><div class="sub" style="font-size:52px;font-weight:800;color:#fff">Otaviano Pivetta <span style="color:#9fb8ad;font-size:32px;font-weight:600">Republicanos</span></div><div class="sub" style="font-size:52px;font-weight:800;color:#fff;margin-top:22px">Wellington Fagundes <span style="color:#9fb8ad;font-size:32px;font-weight:600">PL</span></div><div class="ficha" style="margin-top:28px">Quaest (21 a 24/9) e Veritá (20 a 24/9)</div></div>`],
  ],
  quando: [null, "Otaviano Pivetta"],
});

// 2 — Quaest governo (barras entram na ordem da fala)
{
  const v = qGov.v, nomes = ordena(v, GOV6), linhas = barras(v, nomes, { max: 45, partidos: PART });
  cenas.push({
    fala: "Na Quaest, Pivetta tem vinte e nove por cento, e Wellington, vinte e sete. Doutora Natasha tem onze por cento.",
    movimento: "zoom-out",
    pecas: [
      [0, CAB + `<div class="p" style="top:330px"><span class="chip">Quaest · 1º turno</span></div>`],
      [0, `<div class="p card" style="top:480px"><h3>Governo de MT · votos totais</h3>${resto(3, 104, linhas.slice(3).join(""))}<div style="height:${6 * 104}px"></div><div class="ficha">${ficha(qGov)}</div></div>`],
      [1, lay(0, 104, linhas[0])],
      [2, lay(1, 104, linhas[1])],
      [3, lay(2, 104, linhas[2])],
    ],
    quando: [null, "Pivetta tem", "Wellington, vinte", "Doutora Natasha"],
  });
}

// 3 — empate técnico
cenas.push({
  fala: "Com margem de erro de três pontos, os dois estão em empate técnico.",
  movimento: "pan-dir",
  pecas: [
    [0, CAB + `<div class="p" style="top:330px"><span class="chip">Quaest · margem de erro</span></div><div class="p tit" style="top:470px">29% × 27%</div>`],
    [1, `<div class="p" style="top:700px"><span class="pill">± 3 pontos</span><span class="pill">Pivetta: 26% a 32%</span><span class="pill">Wellington: 24% a 30%</span></div>`],
    [2, `<div class="p" style="top:1060px"><span class="chip" style="font-size:54px;padding:22px 44px">Empate técnico</span></div>`],
  ],
  quando: [null, "margem de erro", "empate técnico"],
});

// 4 — Veritá governo
{
  const v = vGov.v, nomes = ordena(v, GOV6), linhas = barras(v, nomes, { max: 45, partidos: PART });
  const extra = ` · brancos e nulos ${pct(v["Branco/nulo"])}, não souberam ${pct(v["Não sabe/não respondeu"])}`;
  cenas.push({
    fala: "Na pesquisa da Veritá, Pivetta tem trinta e nove vírgula um por cento; Wellington, trinta e dois vírgula três; e Natasha, quinze por cento.",
    movimento: "zoom-in",
    pecas: [
      [0, CAB + `<div class="p" style="top:330px"><span class="chip">Veritá · 1º turno</span></div>`],
      [0, `<div class="p card" style="top:480px"><h3>Governo de MT · votos totais</h3>${resto(3, 104, linhas.slice(3).join(""))}<div style="height:${6 * 104}px"></div><div class="ficha">${ficha(vGov, extra)}</div></div>`],
      [1, lay(0, 104, linhas[0])],
      [2, lay(1, 104, linhas[1])],
      [3, lay(2, 104, linhas[2])],
    ],
    quando: [null, "Pivetta tem", "Wellington, trinta", "Natasha, quinze"],
  });
}

// 5 — votos válidos (Veritá)
cenas.push({
  fala: "Nos votos válidos da Veritá, Pivetta chega a quarenta e quatro vírgula um por cento. Para vencer no primeiro turno, é preciso mais da metade.",
  movimento: "close-in",
  pecas: [
    [0, CAB + `<div class="p" style="top:330px"><span class="chip">Veritá · votos válidos</span></div>`],
    [1, `<div class="p" style="top:560px;text-align:center"><div class="grande">44,1%</div><div class="sub" style="margin-top:18px;font-size:44px;color:#fff;font-weight:800">Otaviano Pivetta</div><div class="sub" style="font-size:32px">Wellington Fagundes 36,3% · Doutora Natasha 16,9%</div></div>`],
    [2, `<div class="p" style="top:1180px;text-align:center"><span class="pill" style="font-size:44px">Vitória no 1º turno: mais de 50% dos válidos</span></div>`],
  ],
  quando: [null, "Pivetta chega", "Para vencer"],
});

// 6 — 2º turno Quaest
{
  const [a, va, b, vb] = qGov.t2[0];
  const v = { [a]: va, [b]: vb };
  const linhas = barras(v, [a, b], { max: 60, partidos: PART });
  cenas.push({
    fala: "No segundo turno simulado pela Quaest, Wellington tem quarenta e um por cento, e Pivetta, trinta e seis, também em empate técnico.",
    movimento: "zoom-out",
    pecas: [
      [0, CAB + `<div class="p" style="top:330px"><span class="chip">Quaest · 2º turno simulado</span></div><div class="p card" style="top:480px"><h3>Governo de MT · votos totais</h3><div style="height:${2 * 104}px"></div><div class="ficha">${ficha(qGov)}</div></div>`],
      [1, lay(0, 104, linhas[0])],
      [2, lay(1, 104, linhas[1])],
      [3, `<div class="p" style="top:1060px"><span class="chip" style="font-size:48px;padding:20px 40px">Empate técnico</span></div>`],
    ],
    quando: [null, "Wellington tem", "Pivetta, trinta", "empate técnico"],
  });
}

// 7 — Senado (Quaest, 1º voto)
{
  const v = qSen.v;
  const nomes = ordena(v, ["Mauro Mendes", "Janaina Riva", "Zé Medeiros", "Pedro Taques", "Fávaro", "Galvan", "Margareth Buzetti", "Coronel Darwin", "Professor Nelson Ferreira", "Beny Godoy"]);
  const PS = { "Mauro Mendes": "União", "Janaina Riva": "MDB", "Zé Medeiros": "PL", "Pedro Taques": "PSB", "Fávaro": "PSD", "Galvan": "Avante", "Margareth Buzetti": "PP", "Coronel Darwin": "Democrata", "Professor Nelson Ferreira": "Agir", "Beny Godoy": "Agir" };
  const linhas = barras(v, nomes, { max: 45, pq: true, partidos: PS });
  const outros = resto(5, 76, linhas.slice(5).join(""));
  cenas.push({
    fala: "Para o Senado, na Quaest, Mauro Mendes tem trinta e sete por cento no primeiro voto, e Janaina Riva, dezenove. Zé Medeiros tem onze; Pedro Taques e Carlos Fávaro, oito cada.",
    movimento: "pan-esq",
    pecas: [
      [0, CAB + `<div class="p" style="top:330px"><span class="chip">Senado · Quaest · 1º voto</span></div><div class="p card" style="top:480px"><h3>Duas vagas · votos totais</h3>${outros}<div style="height:${10 * 76}px"></div><div class="ficha">${ficha(qSen, ` · indecisos ${pct(v["Indecisos"])}, branco/nulo/não vai votar ${pct(v["Branco/nulo/não vai votar"])}`)}</div></div>`],
      [1, lay(0, 76, linhas[0])],
      [2, lay(1, 76, linhas[1])],
      [3, lay(2, 76, linhas[2])],
      [4, lay(3, 76, linhas[3] + linhas[4])],
    ],
    quando: [null, "Mauro Mendes tem", "Janaina Riva", "Zé Medeiros", "Pedro Taques"],
  });
}

// 8 — retrato do momento
cenas.push({
  fala: "Pesquisa é retrato do momento. A eleição é no domingo, quatro de outubro.",
  movimento: "zoom-in",
  pecas: [
    [0, CAB],
    [1, `<div class="p" style="top:560px"><span class="chip" style="font-size:50px;padding:22px 40px">Retrato do momento</span></div>`],
    [2, `<div class="p tit" style="top:820px">Eleição:<br><b>domingo, 4/10</b></div>`],
  ],
  quando: [null, "retrato do momento", "A eleição"],
});

// 9 — encerramento (fala obrigatória)
cenas.push({
  fala: "Todos os casos, com as fontes, estão no Radar Eleitoral do HOJE MT.",
  movimento: "zoom-out",
  pecas: [
    [0, CAB + `<div class="p tit" style="top:560px">Pesquisas, fichas<br>técnicas e casos<br>da Justiça Eleitoral</div>`],
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
  const nome = (suf) => `${PREFIXO}-${n}-${suf}.png`;
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 7 + 3)}</body></html>`);
  await page.screenshot({ path: join(OUT, nome("fundo")) });
  const camadas = [...new Set(c.pecas.map(([k]) => k))].sort((a, b) => a - b);
  const lista = [];
  for (const k of camadas) {
    const html = c.pecas.filter(([kk]) => kk === k).map(([, h]) => h).join("");
    await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(OUT, nome(`c${k}`)), omitBackground: true });
    lista.push({ imagem: `${PASTA}/cenas/${nome(`c${k}`)}`, ...(c.quando[k] ? { quando: c.quando[k] } : { em: 0 }) });
  }
  // prévia com tudo junto (conferência)
  await page.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body style="background:#030605">${fundo(n * 7 + 3)}${c.pecas.map(([, h]) => h).join("")}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(SCRATCH, "b3-previa", `${n}.png`) }).catch(async () => {
    mkdirSync(join(SCRATCH, "b3-previa"), { recursive: true });
    await page.screenshot({ path: join(SCRATCH, "b3-previa", `${n}.png`) });
  });
  roteiro.push({ n, quem: "narrador", fala: c.fala, imagem: `${PASTA}/cenas/${nome("fundo")}`, movimento: c.movimento, camadas: lista });
}
await browser.close();
writeFileSync(join(SCRATCH, "b3-cenas.json"), JSON.stringify(roteiro, null, 1));
console.log(`${cenas.length} cenas; roteiro parcial em ${join(SCRATCH, "b3-cenas.json")}`);
