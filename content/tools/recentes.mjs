// Lista os posts publicados nas últimas N horas (padrão 3), com capa e tags.
//   node content/tools/recentes.mjs [--horas=3] [--json]
// Credenciais: source content/tools/ambiente.sh antes.
import { ghostClient } from "../lib/ghost.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const horas = Number(args.horas || 3);
const api = ghostClient();
const desde = new Date(Date.now() - horas * 3600e3).toISOString();
const posts = await api.posts.browse({
  filter: `status:published+published_at:>'${desde}'`,
  limit: "all",
  fields: "id,slug,title,feature_image,published_at,url",
  include: "tags",
});
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
  console.log(`${posts.length} post(s) nas últimas ${horas} h`);
}
