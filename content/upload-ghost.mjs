#!/usr/bin/env node
// =============================================================
// upload-ghost.mjs — sobe um arquivo (imagem, vídeo) para o Ghost e imprime a
// URL pública. Serve para hospedar mídia do Instagram com endereço estável
// (as exportações do Canva expiram em horas).
// =============================================================
//
//   node upload-ghost.mjs arquivo.jpg [arquivo2.mp4 ...]
//   node upload-ghost.mjs --json a.jpg b.jpg      saída em JSON {arquivo: url}
//
// Env: GHOST_ADMIN_URL, GHOST_ADMIN_API_KEY (id:secret).
import { extname } from "node:path";
import { ghostClient } from "./lib/ghost.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const arquivos = args.filter((a) => !a.startsWith("--"));
if (!arquivos.length) {
  console.log("uso: upload-ghost.mjs [--json] <arquivo> [...]");
  process.exit(1);
}
const api = ghostClient();
const VIDEO = new Set([".mp4", ".webm", ".ogv", ".m4v"]);
const saida = {};
for (const arquivo of arquivos) {
  const ext = extname(arquivo).toLowerCase();
  const r = VIDEO.has(ext)
    ? await api.media.upload({ file: arquivo })
    : await api.images.upload({ file: arquivo, purpose: "image" });
  if (!r?.url) throw new Error(`upload sem url: ${arquivo}`);
  saida[arquivo] = r.url;
  if (!json) console.log(`${arquivo} -> ${r.url}`);
}
if (json) console.log(JSON.stringify(saida, null, 2));
