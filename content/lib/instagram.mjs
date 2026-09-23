// =============================================================
// instagram.mjs — publica foto no Instagram pela Graph API (conta Business)
// =============================================================
// Precisa de:
//   IG_USER_ID       id da conta Instagram Business (ex.: 17841460614185827 = HojeMT)
//   IG_ACCESS_TOKEN  token de usuário do Facebook com instagram_basic +
//                    instagram_content_publish + pages_read_engagement (de longa duração)
// Como obter: Meta for Developers → app → Ferramentas → Explorador da Graph API,
// ou pela conexão já feita no Zapier (Instagram for Business).
//
// A imagem precisa estar numa URL pública (JPEG, 4:5 a 1.91:1, ≤ 8 MB).
// Suba antes no Ghost (`ghost.mjs` → api.images.upload) ou use --url.
const G = process.env.GRAPH_API_URL || "https://graph.facebook.com/v21.0";

async function graph(caminho, { method = "GET", body, token } = {}) {
  const u = new URL(`${G}/${caminho}`);
  const form = new URLSearchParams({ ...(body || {}), access_token: token });
  const r = await fetch(method === "GET" ? `${u}?${form}` : u, {
    method,
    body: method === "GET" ? undefined : form,
  });
  const texto = await r.text();
  let j;
  try {
    j = JSON.parse(texto);
  } catch {
    throw new Error(`Graph API ${r.status}: ${texto.slice(0, 200)}`);
  }
  if (!r.ok || j.error) throw new Error(`Graph API: ${j.error?.message || r.status}`);
  return j;
}

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Publica uma foto. Devolve { id, permalink, timestamp }. */
export async function publicarFoto({
  imagemUrl,
  legenda = "",
  usuarioId = process.env.IG_USER_ID,
  token = process.env.IG_ACCESS_TOKEN,
}) {
  if (!usuarioId || !token) throw new Error("IG_USER_ID e IG_ACCESS_TOKEN são obrigatórios.");
  if (!/^https:\/\//.test(imagemUrl || "")) throw new Error("imagemUrl precisa ser https pública.");
  if (legenda.length > 2200)
    throw new Error(`legenda com ${legenda.length} caracteres (máx. 2.200).`);

  const { id: containerId } = await graph(`${usuarioId}/media`, {
    method: "POST",
    body: { image_url: imagemUrl, caption: legenda },
    token,
  });

  // o container é processado de forma assíncrona; espera até FINISHED
  for (let i = 0; i < 20; i++) {
    const { status_code: st } = await graph(`${containerId}`, {
      body: { fields: "status_code" },
      token,
    });
    if (st === "FINISHED") break;
    if (st === "ERROR" || st === "EXPIRED") throw new Error(`container ${containerId}: ${st}`);
    await espera(3000);
  }

  const { id } = await graph(`${usuarioId}/media_publish`, {
    method: "POST",
    body: { creation_id: containerId },
    token,
  });
  return permalink(id, token);
}

/** Link e horário de um post já publicado. */
export async function permalink(mediaId, token = process.env.IG_ACCESS_TOKEN) {
  const j = await graph(`${mediaId}`, {
    body: { fields: "permalink,timestamp,media_type" },
    token,
  });
  return { id: mediaId, permalink: j.permalink, timestamp: j.timestamp, tipo: j.media_type };
}
