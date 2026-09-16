import Anthropic from "@anthropic-ai/sdk";

function esc(s = "") {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
}

const DISCLAIMER =
  "<hr><p><em>Conteúdo de curadoria automática, resumido a partir da fonte citada. Confira sempre a matéria original.</em></p>";

/**
 * Escreve um resumo ORIGINAL em PT-BR baseado APENAS no material fornecido
 * (título + trecho da fonte), sempre com crédito e link. Nunca inventa fatos.
 * Sem ANTHROPIC_API_KEY, cai num fallback que usa o próprio trecho da fonte.
 */
export async function summarize({ title, snippet, link, source, category }) {
  const fonte = `<p><strong>Fonte:</strong> <a href="${esc(link)}" rel="nofollow noopener" target="_blank">${esc(source || link)}</a></p>`;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const body = snippet ? `<p>${esc(snippet)}</p>` : `<p>Veja a matéria completa na fonte.</p>`;
    return { title, html: body + fonte + DISCLAIMER, excerpt: (snippet || title).slice(0, 200) };
  }

  const client = new Anthropic({ apiKey: key });
  const model = process.env.BLOG_MODEL || process.env.AI_MODEL_SUGGEST || "claude-sonnet-5";
  const prompt = [
    "Você é um editor de curadoria. Reescreva a notícia abaixo em português do Brasil,",
    "em 2 a 4 parágrafos curtos, com um enfoque de tecnologia quando fizer sentido.",
    "REGRAS: use SOMENTE as informações do material fornecido; NÃO invente fatos, números, datas, falas ou nomes;",
    "se algo não estiver no material, não afirme. Não copie frases longas — resuma com suas palavras.",
    "Responda só com o corpo em HTML simples (parágrafos <p>), sem título e sem a fonte (elas são adicionadas fora).",
    "",
    `CATEGORIA: ${category}`,
    `TÍTULO: ${title}`,
    `TRECHO DA FONTE: ${snippet || "(sem trecho)"}`,
    `LINK: ${link}`,
  ].join("\n");

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    const html = (msg.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    if (!html) throw new Error("resposta vazia");
    return { title, html: html + fonte + DISCLAIMER, excerpt: (snippet || title).slice(0, 200) };
  } catch {
    const body = snippet ? `<p>${esc(snippet)}</p>` : `<p>Veja a matéria completa na fonte.</p>`;
    return { title, html: body + fonte + DISCLAIMER, excerpt: (snippet || title).slice(0, 200) };
  }
}
