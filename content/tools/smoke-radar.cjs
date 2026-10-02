/* global document */
// Teste rápido da página do Radar Eleitoral no Chromium (sem erros de JS e com as seções).
//   node content/tools/smoke-radar.cjs [texto-extra-que-deve-aparecer ...]
// Usa o playwright-core de content/node_modules (npm install em content/) e o Chromium
// pré-instalado das sessões web (/opt/pw-browsers).
const path = require("path");
const { chromium } = require("playwright-core"); // content/node_modules ou node_modules da raiz (workspaces)
const PAGINA = "file://" + path.join(__dirname, "..", "paginas", "radar-eleitoral.html");
const CHROMES = [
  process.env.CHROME,
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium",
].filter(Boolean);
(async () => {
  let b;
  for (const exe of CHROMES) {
    b = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] }).catch(() => null);
    if (b) break;
  }
  if (!b) {
    console.error("Chromium não encontrado (defina CHROME=/caminho)");
    process.exit(2);
  }
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  pg.on("pageerror", (e) => errs.push(String(e)));
  pg.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text());
  });
  await pg.goto(PAGINA, { waitUntil: "load" });
  await pg.waitForTimeout(1500);
  const txt = await pg.evaluate(() => document.body.textContent);
  const reais = errs.filter((e) => !/net::|Failed to load resource|ERR_|CORS policy/.test(e));
  console.log("erros de JS:", reais.slice(0, 5));
  let falhou = reais.length > 0;
  for (const s of [
    "Boletins em vídeo",
    "mais recente",
    "Série em ordem cronológica",
    ...process.argv.slice(2),
  ]) {
    const ok = txt.includes(s);
    if (!ok) falhou = true;
    console.log(s, "->", ok);
  }
  await b.close();
  process.exit(falhou ? 1 : 0);
})();
