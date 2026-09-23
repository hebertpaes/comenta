#!/usr/bin/env node
// =============================================================
// imagens.mjs — procura foto real com licença em bancos livres e prepara o
// retrato redondo do card.
// =============================================================
//
//   node imagens.mjs "Ponte da Amizade Paraguai"                lista até 8 fotos com licença e crédito
//   node imagens.mjs "Marco Rubio" --bancos=wikimedia --n=5     só no Commons
//   node imagens.mjs "Ponte da Amizade" --baixar=1 --nome=ponte --saida=fotos --circulo
//        baixa a 1ª da lista em fotos/ponte.jpg, grava fotos/ponte.json (licença,
//        autor, página) e recorta fotos/ponte-circulo.png (220 px, anel verde)
//
// Opções: --n=N  --bancos=a,b  --json  --baixar=I  --nome=x  --saida=dir
//         --circulo[=diametro]  --foco=0.22 (0 = topo da foto, 1 = base)
// Chaves opcionais (env): PEXELS_API_KEY, PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buscar, baixar, circulo, BANCOS } from "./lib/imagens.mjs";

const args = {};
const livres = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args[m[1]] = m[2] ?? true;
  else livres.push(a);
}
const consulta = livres.join(" ").trim();
if (!consulta) {
  console.log(
    'uso: imagens.mjs "termo de busca" [--n=8] [--bancos=openverse,wikimedia,pexels,pixabay,unsplash]'
  );
  console.log("     [--baixar=I --nome=x --saida=dir --circulo[=220] --foco=0.22] [--json]");
  process.exit(process.argv.length > 2 ? 1 : 0);
}

const n = Number(args.n || 8);
const bancos = args.bancos ? String(args.bancos).split(",") : Object.keys(BANCOS);
const { imagens, avisos } = await buscar(consulta, { n, bancos });

if (args.json === true) {
  console.log(JSON.stringify({ consulta, imagens, avisos }, null, 2));
} else {
  console.log(`"${consulta}": ${imagens.length} foto(s) com licença de uso`);
  imagens.forEach((im, i) =>
    console.log(
      `${String(i + 1).padStart(2)}. [${im.licenca}] ${(im.titulo || "(sem título)").slice(0, 60)} — ${im.autor || "?"} (${im.fonte}) ${im.largura || "?"}×${im.altura || "?"}\n    ${im.pagina || im.url}`
    )
  );
  for (const a of avisos) console.log(`  aviso: ${a}`);
}

if (args.baixar) {
  const idx = Number(args.baixar) - 1;
  const im = imagens[idx];
  if (!im) {
    console.error(`ERRO: não há resultado nº ${args.baixar}`);
    process.exit(1);
  }
  const saida = String(args.saida || "fotos");
  const nome = String(args.nome || `foto-${idx + 1}`).replace(/[^a-z0-9_-]+/gi, "-");
  await mkdir(saida, { recursive: true });
  const ext = ((im.url.match(/\.(jpe?g|png|webp)(?:\?|$)/i) || [])[1] || "jpg").toLowerCase();
  const arquivo = join(saida, `${nome}.${ext}`);
  await baixar(im, arquivo);
  await writeFile(join(saida, `${nome}.json`), JSON.stringify({ consulta, ...im }, null, 2));
  console.log(`\nbaixada: ${arquivo}`);
  console.log(`crédito: ${im.credito}`);
  if (args.circulo !== undefined) {
    const diametro = args.circulo === true ? 220 : Number(args.circulo);
    const redonda = join(saida, `${nome}-circulo.png`);
    await circulo(arquivo, { diametro, focoY: Number(args.foco ?? 0.22), saida: redonda });
    console.log(`círculo: ${redonda} (${diametro} px)`);
  }
}
