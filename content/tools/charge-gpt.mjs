#!/usr/bin/env node
// =============================================================
// charge-gpt.mjs — gera a IMAGEM das charges pela API de imagens da OpenAI (GPT).
// Pedido do editor em 09/10/2026: "use api do gpt para gerar somente as charges".
// Só a geração da arte das charges das Curtas muda: a montagem (legenda, selo,
// rodapé "Charge: HOJE MT") continua nos modelos do Canva, e as ilustrações dos
// artigos, cards e capas continuam no Canva.
//
//   node content/tools/charge-gpt.mjs --formato=16x9 --saida=$HOJEMT_TMP/x-16x9.jpg \
//        --prompt="Charge editorial em nanquim com aquarela..." [--ref=foto1.jpg --ref=foto2.jpg]
//   --formato: 16x9 (sai 1600×900) ou 4x5 (sai 1080×1350); recorte central.
//   --ref: fotos oficiais do personagem (arquivos locais, até 3), mandadas ao
//          endpoint de edição para a caricatura sair fiel; sem --ref, geração pura.
//   Modelo: $OPENAI_IMAGE_MODEL (padrão gpt-image-1); qualidade high.
//
// Depois: node content/upload-ghost.mjs <saida> → URL pública → no Canva,
// upload-asset-from-url → media id → update_fill no retângulo do modelo
// (16:9 LBkRvGTgDLdqhT2c; 4:5 LBqXFlGfx0RrjNbj), como no fluxo "Charges no Canva".
//
// Chave: variável de ambiente OPENAI_API_KEY (configuração do ambiente do Claude
// Code). Nunca no repositório, nunca no chat; se faltar, o script para e avisa.
// Rede: usa o proxy do ambiente (source content/tools/ambiente.sh antes).
// =============================================================
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, basename, extname } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");

const args = { ref: [] };
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (!m) continue;
  if (m[1] === "ref") args.ref.push(m[2]);
  else args[m[1]] = m[2] ?? true;
}
const FORMATOS = {
  "16x9": { pedido: "1536x1024", largura: 1600, altura: 900 },
  "4x5": { pedido: "1024x1536", largura: 1080, altura: 1350 },
};
const fmt = FORMATOS[args.formato];
if (!fmt || !args.prompt || !args.saida) {
  console.error("uso: charge-gpt.mjs --formato=16x9|4x5 --prompt=\"...\" --saida=arquivo.jpg [--ref=foto.jpg ...]");
  process.exit(2);
}
const chave = process.env.OPENAI_API_KEY;
if (!chave) {
  console.error("OPENAI_API_KEY ausente: configure a chave nas variáveis de ambiente do ambiente do Claude Code (nunca no chat nem no repositório).");
  process.exit(3);
}
if (args.ref.length > 3) { console.error("no máximo 3 fotos de referência"); process.exit(2); }

const modelo = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
// Regras fixas das charges do HOJE MT (CLAUDE.md, seção Arte), somadas ao prompt da cena.
const regras = " Estilo: charge de jornal desenhada (nanquim com aquarela), tem de parecer desenho e não foto." +
  " Sem texto, sem letras, sem números, sem logotipos, sem balões de fala." +
  " Anatomia correta: cada pessoa com exatamente dois braços, duas mãos, duas pernas e dois pés." +
  " Nada que sugira crime, violência ou humilhação.";
const prompt = String(args.prompt) + regras;

let resp;
if (args.ref.length) {
  const fd = new FormData();
  fd.append("model", modelo);
  fd.append("prompt", prompt);
  fd.append("size", fmt.pedido);
  fd.append("quality", "high");
  fd.append("n", "1");
  for (const r of args.ref) {
    const tipo = /\.png$/i.test(r) ? "image/png" : /\.webp$/i.test(r) ? "image/webp" : "image/jpeg";
    fd.append("image[]", new Blob([readFileSync(r)], { type: tipo }), basename(r));
  }
  resp = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${chave}` }, body: fd });
} else {
  resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelo, prompt, size: fmt.pedido, quality: "high", n: 1 }),
  });
}
const corpo = await resp.text();
if (!resp.ok) {
  let msg = corpo.slice(0, 400);
  try { msg = JSON.parse(corpo).error?.message || msg; } catch {}
  console.error(`erro da API (${resp.status}): ${msg}`);
  process.exit(1);
}
const j = JSON.parse(corpo);
const b64 = j.data?.[0]?.b64_json;
if (!b64) { console.error("a API não devolveu imagem (b64_json)"); process.exit(1); }

mkdirSync(dirname(args.saida), { recursive: true });
const bruto = Buffer.from(b64, "base64");
const ext = extname(args.saida).toLowerCase();
let img = sharp(bruto).resize(fmt.largura, fmt.altura, { fit: "cover", position: "centre" });
img = ext === ".png" ? img.png() : img.jpeg({ quality: 92, mozjpeg: true });
writeFileSync(args.saida, await img.toBuffer());
console.log(JSON.stringify({ saida: args.saida, modelo, formato: args.formato, referencias: args.ref.map((r) => basename(r)), tamanho: `${fmt.largura}x${fmt.altura}` }));
