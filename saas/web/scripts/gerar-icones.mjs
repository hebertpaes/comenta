// Rasteriza os ícones do app instalado a partir dos SVGs de public/.
//
//   node saas/web/scripts/gerar-icones.mjs
//
// Rode só quando o desenho mudar — os PNGs são versionados junto com o código.
// O manifesto podia apontar direto para o SVG, mas aí o ícone do Dock (macOS) e
// o da tela de início do iPhone saem borrados ou em branco: esses dois só
// aceitam bitmap.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publico = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const icones = join(publico, "icones");

// O apple-touch-icon não passa por máscara nem ganha cantos do sistema no
// iOS — o próprio iPhone arredonda —, então usa o desenho normal.
const saidas = [
  { fonte: "icone.svg", arquivo: "192.png", tamanho: 192 },
  { fonte: "icone.svg", arquivo: "512.png", tamanho: 512 },
  { fonte: "icone-maskable.svg", arquivo: "maskable-192.png", tamanho: 192 },
  { fonte: "icone-maskable.svg", arquivo: "maskable-512.png", tamanho: 512 },
  { fonte: "icone.svg", arquivo: "apple-touch-icon.png", tamanho: 180 },
];

await mkdir(icones, { recursive: true });

for (const { fonte, arquivo, tamanho } of saidas) {
  const svg = await readFile(join(publico, fonte));
  const png = await sharp(svg, { density: 384 }).resize(tamanho, tamanho).png().toBuffer();
  await writeFile(join(icones, arquivo), png);
  console.log(`${arquivo} (${tamanho}px) ← ${fonte}`);
}
