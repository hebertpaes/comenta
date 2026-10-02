// Slide de FECHAMENTO dos boletins em vídeo do Radar Eleitoral (editor,
// 02/10/2026: "slides profissionais divulgando o nome do site hojemt e pedindo
// para seguir e compartilhar nossas redes sociais Hoje MT"). É a última cena
// falada de todo boletim, igual em todos, no visual dos slides (slides-lib.mjs):
//   camada 0 (em 0): logo do HOJE MT, "hojemt.com.br" e o link do Radar;
//   camada 1 (quando "Siga"): cartão "Siga o HOJE MT" com as redes do rodapé
//     do site (Instagram @hoje.mt, YouTube @hojemt, X @hojemt);
//   camada 2 (quando "compartilhe"): botão "Compartilhe este boletim".
// Fala fixa (FALA, abaixo); sem apresentação pessoal e sem citar IA (regra de
// 26/09). Depois dela vem a cartela final do charge-cena.mjs (fontes e aviso).
// Uso: node fechamento-boletim.mjs --prefixo=2026-10-02-boletim-05
//      (gera cenas/<prefixo>-fecho-{fundo,c0,c1,c2}.png e imprime a cena JSON)
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { SCRATCH, fundo, CSS } from "./slides-lib.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

export const FALA = "Todos os casos, com as fontes, estão no Radar Eleitoral, em hojemt.com.br. Siga o HOJE MT nas redes sociais e compartilhe.";
// redes do rodapé de hojemt.com.br (conferido em 02/10/2026); Facebook não tem perfil no rodapé
const REDES = [
  ["ig", "Instagram", "@hoje.mt"],
  ["yt", "YouTube", "@hojemt"],
  ["x", "X", "@hojemt"],
];

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
if (!args.prefixo) { console.error("uso: --prefixo=<AAAA-MM-DD-boletim-NN>"); process.exit(2); }
const RAIZ = "/home/user/comenta/content";
const OUT = join(RAIZ, "pautas/videos/argos/cenas");
mkdirSync(OUT, { recursive: true });
const rel = (k) => `pautas/videos/argos/cenas/${args.prefixo}-fecho-${k}.png`;
const logo = readFileSync(join(RAIZ, "assets/hojemt-logo-site-branca.png")).toString("base64");

// ícones simples, traço verde (estilo dos slides)
const icone = {
  ig: `<svg viewBox="0 0 64 64" width="64" height="64"><rect x="6" y="6" width="52" height="52" rx="15" fill="none" stroke="#2EDC8A" stroke-width="5"/><circle cx="32" cy="32" r="11.5" fill="none" stroke="#2EDC8A" stroke-width="5"/><circle cx="46.5" cy="17.5" r="3.6" fill="#2EDC8A"/></svg>`,
  yt: `<svg viewBox="0 0 64 64" width="64" height="64"><rect x="4" y="13" width="56" height="38" rx="12" fill="none" stroke="#2EDC8A" stroke-width="5"/><path d="M27 23 L42 32 L27 41 Z" fill="#2EDC8A"/></svg>`,
  x: `<svg viewBox="0 0 64 64" width="64" height="64"><path d="M12 10 H24 L52 54 H40 Z" fill="none" stroke="#2EDC8A" stroke-width="5" stroke-linejoin="round"/><path d="M50 10 L14 54" stroke="#2EDC8A" stroke-width="5" stroke-linecap="round"/></svg>`,
  share: `<svg viewBox="0 0 64 64" width="58" height="58"><circle cx="46" cy="14" r="8" fill="#04150c"/><circle cx="18" cy="32" r="8" fill="#04150c"/><circle cx="46" cy="50" r="8" fill="#04150c"/><path d="M24 28 L40 18 M24 36 L40 46" stroke="#04150c" stroke-width="5"/></svg>`,
};

const estilo = `
.logo{position:absolute;left:0;right:0;top:310px;text-align:center}.logo img{width:480px}
.site{position:absolute;left:0;right:0;top:530px;text-align:center;font:800 112px/1 Inter;letter-spacing:-.02em;color:#2EDC8A;text-shadow:0 0 40px rgba(46,220,138,.65)}
.radar{position:absolute;left:70px;right:70px;top:685px;text-align:center;font:600 38px/1.35 Inter;color:#cfe9dd}
.radar b{color:#fff;font-weight:800}
.redes{top:870px}
.rede{display:flex;align-items:center;gap:30px;height:118px;border-top:2px solid rgba(143,233,194,.18)}
.rede:first-of-type{border-top:0}
.rede .nome{font:700 40px Inter;color:#cfe9dd;width:270px}
.rede .arroba{font:800 54px Inter;color:#fff}
.botao{position:absolute;left:0;right:0;top:1430px;text-align:center}
.botao span{display:inline-flex;align-items:center;gap:22px;background:#2EDC8A;color:#04150c;border-radius:999px;padding:26px 56px;font:800 46px Inter;letter-spacing:.03em;text-transform:uppercase;box-shadow:0 0 50px rgba(46,220,138,.7)}
`;
const c0 = `<div class="p cab">RADAR ELEITORAL · HOJE MT · ELEIÇÕES 2026</div>
<div class="logo"><img src="data:image/png;base64,${logo}"></div>
<div class="site">hojemt.com.br</div>
<div class="radar">Todos os casos, com as fontes:<br><b>hojemt.com.br/radar-eleitoral</b></div>`;
const c1 = `<div class="p card redes"><h3>Siga o HOJE MT</h3>${REDES.map(([k, nome, arroba]) =>
  `<div class="rede">${icone[k]}<span class="nome">${nome}</span><span class="arroba">${arroba}</span></div>`).join("")}</div>`;
const c2 = `<div class="botao"><span>${icone.share}Compartilhe este boletim</span></div>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const html = (corpo, bg) => `<!doctype html><html><head><style>${CSS}${estilo}</style></head><body${bg ? ' style="background:#030605"' : ""}>${corpo}</body></html>`;
const foto = async (corpo, k, bg) => { await page.setContent(html(corpo, bg)); await page.waitForLoadState("load"); await page.screenshot({ path: join(RAIZ, rel(k)), omitBackground: !bg }); };
await foto(fundo(11), "fundo", true);
await foto(c0, "c0");
await foto(c1, "c1");
await foto(c2, "c2");
await page.setContent(html(fundo(11) + c0 + c1 + c2, true)); await page.waitForLoadState("load");
await page.screenshot({ path: join(SCRATCH, `${args.prefixo}-fecho-previa.png`) });
await browser.close();

const cena = {
  quem: "narrador",
  fala: FALA,
  imagem: rel("fundo"),
  movimento: "zoom-out",
  camadas: [
    { imagem: rel("c0"), em: 0 },
    { imagem: rel("c1"), quando: "Siga o HOJE MT" },
    { imagem: rel("c2"), quando: "compartilhe" },
  ],
};
console.log(JSON.stringify(cena, null, 1));
console.error(`prévia em ${join(SCRATCH, args.prefixo + "-fecho-previa.png")}`);
