// Peças comuns dos slides do boletim em vídeo (formato só voz e slides, desde
// 29/09): fontes, fundo escuro com ondas e curvas de nível, CSS dos chips e
// cartões, cartão de reprodução de postagem de rede social e moldura de vídeo.
// Usado por graficos-boletim-NN.mjs (a partir do nº 3).
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Pasta de trabalho (prévias, cenas parciais, caches): $HOJEMT_TMP ou /tmp/hojemt.
// As fontes Inter ficam no repositório (content/assets/fonts), e o playwright-core
// vem de content/node_modules (npm install em content/), para qualquer sessão nova.
export const SCRATCH = process.env.HOJEMT_TMP || "/tmp/hojemt";
mkdirSync(SCRATCH, { recursive: true });
export const FONTES = join(dirname(fileURLToPath(import.meta.url)), "../../../assets/fonts");
export const b64 = (p) => readFileSync(p).toString("base64");
export const fontes = [400, 600, 700, 800]
  .map((w) => `@font-face{font-family:Inter;font-weight:${w};src:url(data:font/woff2;base64,${b64(join(FONTES, `inter-${w}.woff2`))}) format("woff2");}`)
  .join("\n");
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
export const pct = (v) => String(v).replace(".", ",") + "%";

// ------------------------------------------------------------ fundo
// ondas escuras "de seda" + curvas de nível em verde-água, variando por cena
export function fundo(semente) {
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
export const CSS = `${fontes}
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
.post{background:rgba(8,20,16,.86);border:2px solid rgba(46,220,138,.8);border-radius:38px;padding:34px 38px;box-shadow:0 0 44px rgba(46,220,138,.32)}
.post .topo{display:flex;align-items:center;gap:18px;margin-bottom:20px}
.post .rede{font:800 26px Inter;letter-spacing:.08em;color:#04150c;background:#2EDC8A;border-radius:12px;padding:8px 14px;text-transform:uppercase}
.post .quem{font:800 34px/1.15 Inter;color:#fff}.post .quem small{display:block;font:600 26px Inter;color:#9fb8ad}
.post .txt{font:600 32px/1.35 Inter;color:#e7fff4;margin-bottom:22px}
.post img{width:100%;border-radius:22px;display:block}
.post .cred{font:600 24px/1.35 Inter;color:#9fb8ad;margin-top:18px}
.janela{position:absolute;border:3px solid #2EDC8A;border-radius:28px;box-shadow:0 0 40px rgba(46,220,138,.55)}
.cred-video{position:absolute;white-space:nowrap;font:700 24px/1.3 Inter;color:#cfe9dd;background:rgba(4,12,9,.78);border-radius:14px;padding:10px 16px}
.tarja{position:absolute;left:70px;right:70px}
.tarja .aspas{display:inline-flex;align-items:center;justify-content:center;width:84px;height:66px;border-radius:10px;background:#2EDC8A;color:#04150c;font:900 110px/1 Georgia,serif;padding-top:52px;overflow:hidden;margin-bottom:14px;box-shadow:0 0 22px rgba(46,220,138,.5)}
.tarja p{font:800 50px/1.42 Inter;color:#0b0f0d}
.tarja p span{background:#fff;padding:4px 14px;-webkit-box-decoration-break:clone;box-decoration-break:clone;border-radius:6px}
.tarja p b{color:#0a7a4c}
`;


const dataBr = (d) => (d ? d.split("-").reverse().join("/") : "");
const semLinks = (t) => String(t || "").replace(/https?:\/\/t\.co\/\w+/g, "").replace(/\s+/g, " ").trim();
const curto = (t, n = 170) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t);

/** Cartão de REPRODUÇÃO de uma postagem (JSON do redes-post.mjs): visual do
 * HOJE MT (não imita a interface da rede), texto entre aspas, imagem original
 * sem alteração e crédito com perfil, rede e data. */
export function cartaoPost(post, { topo = 460, imagemMax = 620 } = {}) {
  const img = post.imagem ? `<img src="data:image/jpeg;base64,${b64(post.imagem)}" style="max-height:${imagemMax}px;object-fit:contain;background:#000">` : "";
  return `<div class="p post" style="top:${topo}px"><div class="topo"><span class="rede">${esc(post.rede)}</span><div class="quem">${esc(post.autor || post.perfil)}<small>${esc(post.perfil || "")} · ${dataBr(post.data)}</small></div></div>` +
    `<div class="txt">“${esc(curto(semLinks(post.texto)))}”</div>${img}<div class="cred">${esc(post.credito)}</div></div>`;
}

/** Moldura (camada) para o trecho de vídeo que o charge-cena.mjs põe em
 * `clipe.caixa`: borda com brilho e o crédito logo abaixo. */
export function molduraVideo([x, y, w, h], credito) {
  return `<div class="janela" style="left:${x - 3}px;top:${y - 3}px;width:${w + 6}px;height:${h + 6}px"></div>` +
    `<div class="cred-video" style="left:${x}px;top:${y + h + 14}px">${esc(credito)}</div>`;
}

/**
 * Tarja de manchete (formato do reel indicado pelo editor em 29/09: ícone de
 * aspas + linhas em caixa branca sobre o vídeo). Vai como camada por cima de
 * uma cena do Veo ou de um clipe real com crédito. `**trecho**` sai em verde.
 * Só texto apurado; nunca frase atribuída a alguém sem aspas e fonte.
 */
export function tarjaManchete(texto, { topo = 1180 } = {}) {
  const corpo = esc(texto).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  return `<div class="tarja" style="top:${topo}px"><div class="aspas">“</div><p><span>${corpo}</span></p></div>`;
}
