// Cria um RASCUNHO no Ghost a partir de uma matéria em Markdown no formato das pautas
// (ex.: content/pautas/camara-varzea-grande/2026-10-01-pccss-saude-garis-aprovados.md):
//   linha 1 "# Título"; cabeçalho; "---"; CORPO; "---"; "**Fontes:** ..."; "**Checagem pendente:** ...".
// Vai para o Ghost: o corpo (## subtítulos, parágrafos, **negrito**, [links](url)) e o parágrafo
// de Fontes (URLs soltas viram links). A checagem pendente fica só no .md.
//   node content/tools/rascunho-ghost.mjs --md=<arquivo.md> --slug=<slug> --tag=cidades|politica|... --resumo="até 300 caracteres" [--seco]
// Nunca publica: status sempre "draft". Se o slug já existir, não cria outro.
import { readFileSync } from "node:fs";
import { ghostClient } from "../lib/ghost.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
if (!args.md || !args.slug || !args.tag || !args.resumo) {
  console.error(
    'uso: rascunho-ghost.mjs --md=<arquivo> --slug=<slug> --tag=<slug-da-tag> --resumo="..." [--seco]'
  );
  process.exit(2);
}
if (String(args.resumo).length > 300) {
  console.error(`resumo com ${String(args.resumo).length} caracteres (máximo 300)`);
  process.exit(2);
}

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (t) =>
  esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s)<;,]+)/g, '$1<a href="$2">$2</a>');

const md = readFileSync(args.md, "utf8");
const titulo = md.split("\n")[0].replace(/^#\s*/, "").trim();
const partes = md.split(/\n---\n/);
if (partes.length < 2) {
  console.error("o .md precisa ter o corpo entre linhas ---");
  process.exit(2);
}
const blocos = partes[1].trim().split(/\n\s*\n/);
const html = blocos.map((b) => {
  b = b.trim();
  if (b.startsWith("## ")) return `<h2>${inline(b.slice(3))}</h2>`;
  if (/^[-*] /m.test(b) && b.split("\n").every((l) => /^[-*] /.test(l)))
    return `<ul>${b
      .split("\n")
      .map((l) => `<li>${inline(l.slice(2))}</li>`)
      .join("")}</ul>`;
  return `<p>${inline(b.replace(/\n/g, " "))}</p>`;
});
const fontes = (partes[2] || "").split(/\n\s*\n/).find((b) => b.trim().startsWith("**Fontes:**"));
if (fontes) html.push(`<p>${inline(fontes.trim().replace(/\n/g, " "))}</p>`);

if (args.seco) {
  console.log(titulo);
  console.log(html.join("\n"));
  process.exit(0);
}
const api = ghostClient();
const ja = await api.posts.browse({ filter: `slug:${args.slug}`, limit: 1 });
if (ja.length) {
  console.log(`já existe: ${ja[0].id} (${ja[0].status}) — nada criado`);
  process.exit(0);
}
const p = await api.posts.add(
  {
    title: titulo,
    slug: args.slug,
    html: html.join("\n"),
    custom_excerpt: String(args.resumo),
    status: "draft",
    tags: [{ slug: String(args.tag) }],
  },
  { source: "html" }
);
console.log(`rascunho criado: ${p.id} ${p.slug} (${p.status}) — ${p.url}`);
