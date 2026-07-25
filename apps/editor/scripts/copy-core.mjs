// Copia os binários do @ffmpeg/core para public/ffmpeg/, para que sejam
// servidos localmente (same-origin) — sem depender de nenhuma CDN em runtime.
// Roda automaticamente no postinstall e antes de dev/build.
import { mkdir, copyFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "public/ffmpeg");

// Resolvemos pelo algoritmo do Node em vez de montar o caminho à mão: no
// monorepo com npm workspaces o @ffmpeg/core é içado para o node_modules da
// raiz, e 'node_modules/@ffmpeg/core' relativo a este app não existe mais.
//
// Usamos import.meta.resolve (e não require.resolve) por dois motivos: o
// package.json do @ffmpeg/core declara "exports", que bloqueia subpaths
// profundos como './dist/esm/ffmpeg-core.js'; e a condição "import" é
// justamente a que aponta para o build ESM — o worker do @ffmpeg/ffmpeg é um
// module worker e importa o core via import(), esperando um `export default`
// que só existe no ESM.
const specifiers = ["@ffmpeg/core", "@ffmpeg/core/wasm"];

async function main() {
  let sources;
  try {
    sources = specifiers.map((s) => fileURLToPath(import.meta.resolve(s)));
  } catch {
    console.warn("[copy-core] @ffmpeg/core não encontrado — pulei a cópia.");
    return;
  }
  await mkdir(outDir, { recursive: true });
  for (const src of sources) {
    await copyFile(src, resolve(outDir, basename(src)));
  }
  console.log("[copy-core] core do FFmpeg copiado para public/ffmpeg/");
}

main().catch((err) => {
  console.error("[copy-core] falhou:", err);
  process.exit(1);
});
