#!/usr/bin/env node
// =============================================================
// pagina-ghost.mjs — publica uma página "de código" do Ghost a partir de um
// arquivo versionado em content/paginas/ (ex.: o Radar Eleitoral).
//
// Essas páginas têm um único cartão HTML (estilo + marcação + script). O
// script troca o conteúdo desse cartão pelo do arquivo e guarda antes uma
// cópia da versão no ar em content/paginas/backup/ (para desfazer, publique
// a cópia de volta).
//
//   node pagina-ghost.mjs --slug=radar-eleitoral --arquivo=paginas/radar-eleitoral.html --dry-run
//   node pagina-ghost.mjs --slug=radar-eleitoral --arquivo=paginas/radar-eleitoral.html
//   node pagina-ghost.mjs --slug=radar-eleitoral --baixar      só salva a versão no ar
//
// Env: GHOST_ADMIN_URL, GHOST_ADMIN_API_KEY (id:secret).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ghostClient } from "./lib/ghost.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
if (!args.slug || (!args.arquivo && !args.baixar)) {
  console.log("uso: pagina-ghost.mjs --slug=<slug> (--arquivo=<html> [--dry-run] | --baixar)");
  process.exit(1);
}
const api = ghostClient();
const pagina = await api.pages.read({ slug: String(args.slug) }, { formats: "lexical,html" });
const lexical = JSON.parse(pagina.lexical);
const cartoes = lexical.root.children.filter((n) => n.type === "html");
if (cartoes.length !== 1) throw new Error(`esperava 1 cartão HTML na página, achei ${cartoes.length}`);

const dir = new URL("./paginas/backup/", import.meta.url);
mkdirSync(dir, { recursive: true });
const carimbo = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const copia = new URL(`${pagina.slug}-${carimbo}.html`, dir);
writeFileSync(copia, cartoes[0].html);
console.log(`página: ${pagina.title} (${pagina.status}) · versão no ar salva em paginas/backup/${pagina.slug}-${carimbo}.html`);
if (args.baixar) process.exit(0);

const novo = readFileSync(String(args.arquivo), "utf8");
if (!/<script[\s>]/.test(novo) || !/<style[\s>]/.test(novo)) throw new Error("o arquivo precisa ter <style> e <script>");
console.log(`cartão atual: ${cartoes[0].html.length} caracteres · novo: ${novo.length} caracteres`);
if (args["dry-run"]) { console.log("dry-run: nada publicado."); process.exit(0); }

cartoes[0].html = novo;
const ed = await api.pages.edit({ id: pagina.id, updated_at: pagina.updated_at, lexical: JSON.stringify(lexical) });
console.log(`publicado: ${ed.url} (${ed.status}, atualizado ${ed.updated_at})`);
