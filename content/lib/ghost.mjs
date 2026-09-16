import GhostAdminAPI from "@tryghost/admin-api";

/**
 * Cliente do Ghost Admin API.
 * A chave sai em: Ghost → Settings → Integrations → Add custom integration →
 * copie a "Admin API Key" (formato id:secret) e a "API URL".
 */
export function ghostClient() {
  const url = process.env.GHOST_ADMIN_URL || "http://localhost:2368";
  const key = process.env.GHOST_ADMIN_API_KEY;
  if (!key || !key.includes(":")) {
    throw new Error(
      "GHOST_ADMIN_API_KEY ausente/inválida. Em Ghost → Settings → Integrations → Custom, copie a Admin API Key (id:secret)."
    );
  }
  return new GhostAdminAPI({ url, key, version: "v5.0" });
}

/** Já existe um post com este slug? (dedupe idempotente por fonte). */
export async function postExists(api, slug) {
  try {
    const found = await api.posts.browse({ filter: `slug:${slug}`, limit: 1 });
    return found.length > 0;
  } catch {
    return false;
  }
}

/** Cria o post (rascunho por padrão; publicado só se BLOG_AUTOPUBLISH=1). */
export async function createPost(api, { title, slug, html, excerpt, tags, featureImage }) {
  const status = process.env.BLOG_AUTOPUBLISH === "1" ? "published" : "draft";
  return api.posts.add(
    {
      title,
      slug,
      status,
      html,
      excerpt: excerpt?.slice(0, 290) || undefined,
      feature_image: featureImage || undefined,
      tags: (tags || []).map((name) => ({ name })),
    },
    { source: "html" }
  );
}
