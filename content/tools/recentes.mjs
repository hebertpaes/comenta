// Lista posts publicados, mais recentes primeiro, com capa e tags.
//   node content/tools/recentes.mjs [--horas=3]                  últimas N horas (padrão 3)
//   node content/tools/recentes.mjs --todos --padrao=/charge- --max=5
//        todo o acervo (paginado, 100 por página), só capas que contêm o padrão, até N itens
//   --json   saída em JSON
// Credenciais: source content/tools/ambiente.sh antes (na mesma chamada do Bash).
import { ghostClient } from "../lib/ghost.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const horas = Number(args.horas || 3);
const padrao = args.padrao ? String(args.padrao) : null;
const max = args.max ? Number(args.max) : Infinity;
const api = ghostClient();
const filtro = args.todos
  ? "status:published"
  : `status:published+published_at:>'${new Date(Date.now() - horas * 3600e3).toISOString()}'`;

const posts = [];
for (let page = 1; posts.length < max; page++) {
  const lote = await api.posts.browse({
    filter: filtro,
    limit: 100,
    page,
    order: "published_at DESC",
    fields: "id,slug,title,feature_image,published_at,url",
    include: "tags",
  });
  for (const p of lote) {
    if (padrao && !(p.feature_image || "").includes(padrao)) continue;
    posts.push(p);
    if (posts.length >= max) break;
  }
  if (lote.length < 100) break;
}

if (args.json) {
  console.log(
    JSON.stringify(
      posts.map((p) => ({
        id: p.id,
        slug: p.slug,
        titulo: p.title,
        capa: p.feature_image,
        publicado: p.published_at,
        url: p.url,
        tags: (p.tags || []).map((t) => t.slug),
      })),
      null,
      1
    )
  );
} else {
  for (const p of posts)
    console.log(
      p.published_at.slice(0, 16),
      p.slug,
      "|",
      (p.feature_image || "").split("/").pop(),
      "|",
      (p.tags || []).map((t) => t.slug).join(","),
      "|",
      p.title.slice(0, 90)
    );
  console.log(
    `${posts.length} post(s)` +
      (args.todos ? " no acervo" : ` nas últimas ${horas} h`) +
      (padrao ? ` com capa "${padrao}"` : "")
  );
}
