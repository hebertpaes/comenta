#!/usr/bin/env node
// =============================================================
// imagem-post.mjs — troca a imagem de destaque (feature_image) de um post do
// Ghost por um arquivo local (charge, card, foto), via Admin API.
// =============================================================
//
//   node imagem-post.mjs --slug=creche-a-la-churrasco --imagem=pautas/charges/2026-09-23-creche-a-la-churrasco.jpg
//   node imagem-post.mjs --slug=x --imagem=y.jpg --legenda="Charge: HOJE MT" --alt="descrição"
//   node imagem-post.mjs --slug=x --imagem=y.jpg --dry-run       só mostra o que faria
//
// Env: GHOST_ADMIN_URL (ex.: https://hojemt.com.br), GHOST_ADMIN_API_KEY (id:secret).
// A imagem antiga fica registrada na saída (para desfazer, rode de novo com ela).
import { stat } from "node:fs/promises";
import { ghostClient } from "./lib/ghost.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const slug = String(args.slug || "");
const imagem = String(args.imagem || "");
if (!slug || !imagem) {
  console.log(
    'uso: imagem-post.mjs --slug=<slug> --imagem=<arquivo> [--legenda="..."] [--alt="..."] [--dry-run]'
  );
  process.exit(process.argv.length > 2 ? 1 : 0);
}
await stat(imagem).catch(() => {
  console.error(`ERRO: arquivo não existe: ${imagem}`);
  process.exit(1);
});

const api = ghostClient();
const post = await api.posts.read({ slug }).catch((e) => {
  console.error(`ERRO: post "${slug}": ${e.message}`);
  process.exit(1);
});
console.log(`post: ${post.title} (${post.status}) — ${post.url}`);
console.log(`imagem atual: ${post.feature_image || "(nenhuma)"}`);
if (args["dry-run"] === true) {
  console.log(`dry-run: enviaria ${imagem} e trocaria a feature_image.`);
  process.exit(0);
}

const enviado = await api.images.upload({ file: imagem, purpose: "image" });
if (!enviado?.url) throw new Error("upload não devolveu url");
const editado = await api.posts.edit({
  id: post.id,
  feature_image: enviado.url,
  feature_image_alt: (typeof args.alt === "string" ? args.alt : post.feature_image_alt || post.title).slice(0, 190), // limite do Ghost: 191
  feature_image_caption:
    typeof args.legenda === "string"
      ? args.legenda
      : post.feature_image_caption || "Charge: HOJE MT",
  updated_at: post.updated_at,
});
console.log(`imagem nova: ${editado.feature_image}`);
console.log(`legenda: ${editado.feature_image_caption || "(sem)"}`);
