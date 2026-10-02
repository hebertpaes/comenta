// Imprime título, resumo, capa e o texto (sem HTML) de posts do Ghost.
//   node content/tools/ler-post.mjs <slug> [<slug> ...]      (aceita --id=<id> para rascunhos)
// Credenciais: source content/tools/ambiente.sh antes.
import { ghostClient } from "../lib/ghost.mjs";

const api = ghostClient();
for (const a of process.argv.slice(2)) {
  const chave = a.startsWith("--id=") ? { id: a.slice(5) } : { slug: a };
  const p = await api.posts.read(chave, { formats: "html" }).catch((e) => {
    console.error(`ERRO ${a}: ${e.message}`);
    return null;
  });
  if (!p) continue;
  console.log("=====", p.slug, p.status, p.published_at || "", p.feature_image || "");
  console.log("TÍTULO:", p.title);
  console.log("RESUMO:", p.custom_excerpt || "");
  console.log(
    (p.html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000)
  );
}
