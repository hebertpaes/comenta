// Slide de INTRO dos boletins em vídeo do Radar Eleitoral (editor, 01/10/2026:
// "com uma intro e com o fechamento"): fundo + camada 0 (cabeçalho, chip
// "BOLETIM Nº N" e título "Radar Eleitoral") + camada 1 (data e tema), no
// mesmo visual dos slides (slides-lib.mjs). A intro é a 1ª cena do roteiro,
// com a fala "Radar Eleitoral do HOJE MT. Boletim número N, <dia>." — sem
// apresentação pessoal e sem citar IA (regra de 26/09). O fechamento é a
// última cena ("Todos os casos, com as fontes, estão no Radar Eleitoral do
// HOJE MT.") + a cartela final do charge-cena.mjs.
// Uso: node intro-boletim.mjs --prefixo=2026-09-30-boletim-04 --n=4 \
//        --data="Quarta-feira, 30 de setembro de 2026" --tema="A Justiça Eleitoral na última semana de campanha"
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { SCRATCH, esc, fundo, CSS } from "./slides-lib.mjs";
const require = createRequire(join(SCRATCH, "pw", "package.json"));
const { chromium } = require("playwright-core");

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
if (!args.prefixo || !args.n || !args.data) { console.error("uso: --prefixo=<AAAA-MM-DD-boletim-NN> --n=<N> --data=\"<dia por extenso>\" [--tema=\"…\"]"); process.exit(2); }
const OUT = join("/home/user/comenta/content/pautas/videos/argos", "cenas");
mkdirSync(OUT, { recursive: true });
const arq = (k) => join(OUT, `${args.prefixo}-intro-${k}.png`);

const c0 = `<div class="p cab">RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>
<div class="p" style="top:560px"><span class="chip">Boletim nº ${esc(args.n)}</span></div>
<div class="p tit" style="top:690px;font-size:110px">Radar<br><b>Eleitoral</b></div>`;
const c1 = `<div class="p" style="top:1010px"><span class="pill">${esc(args.data)}</span></div>` +
  (args.tema ? `<div class="p card" style="top:1150px"><h3>Neste boletim</h3><div class="sub" style="font-size:44px;color:#fff">${esc(args.tema)}</div></div>` : "") +
  `<div class="p" style="top:1700px;text-align:center;font:600 30px Inter;color:#9fb8ad">Mato Grosso · hojemt.com.br/radar-eleitoral</div>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const html = (corpo, bg) => `<!doctype html><html><head><style>${CSS}</style></head><body${bg ? ' style="background:#030605"' : ""}>${corpo}</body></html>`;
await page.setContent(html(fundo(7), true)); await page.screenshot({ path: arq("fundo") });
await page.setContent(html(c0)); await page.screenshot({ path: arq("c0"), omitBackground: true });
await page.setContent(html(c1)); await page.screenshot({ path: arq("c1"), omitBackground: true });
await page.setContent(html(fundo(7) + c0 + c1, true)); await page.screenshot({ path: join(SCRATCH, `${args.prefixo}-intro-previa.png`) });
await browser.close();
console.log(`intro: ${arq("fundo")}, ${arq("c0")}, ${arq("c1")} · prévia em ${join(SCRATCH, args.prefixo + "-intro-previa.png")}`);
