// =============================================================
// ilustrar.mjs — ilustração REALISTA para Curtas (charges) e matérias sem foto
// =============================================================
// Substitui a charge vetorial (bonecos geométricos) por uma cena realista:
//   1. um modelo de texto lê a matéria e descreve UMA cena (sem gente real,
//      sem texto na imagem) + a frase curta da charge;
//   2. um modelo de imagem pinta a cena em 16:9;
//   3. o `sharp` compõe, por código, a frase (legenda) e o selo
//      "CHARGE · HOJE MT" / "ILUSTRAÇÃO · HOJE MT" — texto em português com
//      acento fica certo porque não passa pelo modelo de imagem.
//
// Regra editorial (content/README.md): ilustração sempre MARCADA como tal e
// nunca um rosto real passando por foto de um fato. Por isso o prompt proíbe
// pessoas reconhecíveis e o selo vai queimado na imagem.
//
// Env:
//   GEMINI_API_KEY        obrigatória para gerar (sem ela, só `compor` funciona)
//   GEMINI_API_URL        default https://generativelanguage.googleapis.com
//   BLOG_IMAGEM_MODELO    default gemini-2.5-flash-image
//   BLOG_TEXTO_MODELO     default gemini-2.5-flash

const GEMINI_URL = (
  process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com"
).replace(/\/+$/, "");
const MODELO_IMAGEM = process.env.BLOG_IMAGEM_MODELO || "gemini-2.5-flash-image";
const MODELO_TEXTO = process.env.BLOG_TEXTO_MODELO || "gemini-2.5-flash";

/** Guia de estilo por tipo de peça. O modelo de imagem recebe isto + a cena. */
export const ESTILO = {
  charge:
    "Realistic editorial illustration for a Brazilian newspaper: a detailed digital painting with cinematic natural light, rich textures, believable anatomy and perspective, wide 16:9 composition. The satire lives in the scene and in body language, never in caricature of a real person.",
  ilustracao:
    "Photorealistic editorial photograph look: 35mm lens, shallow depth of field, natural light, documentary framing, wide 16:9 composition.",
};

/** Vale para todo tipo: sem texto (a legenda entra por código) e sem gente real. */
export const RESTRICOES =
  "No text, no letters, no numbers, no signs, no logos, no watermarks. No recognizable real-world faces or public figures: people are generic, seen from behind, in profile or out of focus. No real political party flags; any flag or banner is plain white or neutral, never red and never green-and-yellow as a political symbol. No violence, no gore.";

export const SELOS = {
  charge: "CHARGE · HOJE MT",
  ilustracao: "ILUSTRAÇÃO · HOJE MT",
};

function resumoErro(texto) {
  try {
    const j = JSON.parse(texto);
    return j.error?.message || texto.slice(0, 300);
  } catch {
    return texto.slice(0, 300);
  }
}

async function gemini(modelo, corpo, chave) {
  const r = await fetch(`${GEMINI_URL}/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify(corpo),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`Gemini (${modelo}) ${r.status}: ${resumoErro(texto)}`);
  return JSON.parse(texto);
}

/**
 * Lê a matéria e devolve { cena, legenda }: a cena em inglês (o modelo de
 * imagem entende melhor) e a frase da charge em português, curta.
 * Sem chave ou com erro no modelo, cai num fallback que usa título + resumo.
 */
export async function descreverCena({
  titulo,
  resumo = "",
  texto = "",
  tipo = "charge",
  chave = process.env.GEMINI_API_KEY,
}) {
  const fallback = {
    cena: [titulo, resumo].filter(Boolean).join(". "),
    legenda: tipo === "charge" ? String(titulo || "").slice(0, 110) : "",
    origem: "fallback",
  };
  if (!chave) return fallback;

  const prompt = [
    "Você é o ilustrador de um jornal de Mato Grosso. Leia a matéria e responda SÓ com JSON:",
    '{"cena": "...", "legenda": "..."}',
    "",
    "cena: descrição em INGLÊS (60 a 120 palavras) de UMA cena realista que represente a matéria,",
    "com lugar plausível em Mato Grosso (Cuiabá, Várzea Grande, Sinop, interior, Assembleia, rua, fazenda…),",
    "hora do dia, luz, o que cada pessoa está fazendo e objetos que contam a história.",
    "PROIBIDO: nomes ou rostos de pessoas reais, texto/placas/logos dentro da imagem, símbolos de partido.",
    "Pessoas aparecem de costas, de perfil ou desfocadas. Sem violência.",
    tipo === "charge"
      ? "legenda: a frase da charge, em português, com ironia leve, no máximo 90 caracteres, sem citar nome de pessoa real."
      : 'legenda: string vazia "".',
    "",
    `TÍTULO: ${titulo}`,
    `RESUMO: ${resumo || "(sem resumo)"}`,
    `TEXTO: ${String(texto || "").slice(0, 2500) || "(sem texto)"}`,
  ].join("\n");

  try {
    const r = await gemini(
      MODELO_TEXTO,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      },
      chave
    );
    const bruto = (r.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .trim();
    const j = JSON.parse(bruto.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    const cena = String(j.cena || "").trim();
    if (cena.length < 20) throw new Error("cena vazia");
    return {
      cena,
      legenda:
        tipo === "charge"
          ? String(j.legenda || fallback.legenda)
              .trim()
              .slice(0, 110)
          : "",
      origem: MODELO_TEXTO,
    };
  } catch (e) {
    console.warn(`  descrição por IA falhou (${e.message}); usando título + resumo`);
    return fallback;
  }
}

/** Monta o prompt final de imagem: estilo + cena + restrições. */
export function promptImagem(cena, tipo = "charge") {
  return `${ESTILO[tipo] || ESTILO.charge}\n\nScene: ${cena}\n\n${RESTRICOES}`;
}

/** Gera a imagem 16:9 no Gemini. Devolve { imagem: Buffer, mime, prompt }. */
export async function gerarImagem(
  cena,
  { tipo = "charge", chave = process.env.GEMINI_API_KEY } = {}
) {
  if (!chave)
    throw new Error("GEMINI_API_KEY ausente: crie uma em https://aistudio.google.com/apikey");
  const prompt = promptImagem(cena, tipo);
  const r = await gemini(
    MODELO_IMAGEM,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
    },
    chave
  );
  const parte = (r.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
  if (!parte) {
    const motivo = r.candidates?.[0]?.finishReason || r.promptFeedback?.blockReason || "sem imagem";
    throw new Error(`Gemini não devolveu imagem (${motivo}).`);
  }
  return {
    imagem: Buffer.from(parte.inlineData.data, "base64"),
    mime: parte.inlineData.mimeType || "image/png",
    prompt,
  };
}

const escXml = (s = "") =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

/** Quebra em até `max` linhas de ~`largura` caracteres, sem cortar palavra. */
export function quebraLinhas(texto, largura = 52, max = 2) {
  const palavras = String(texto || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const linhas = [];
  let atual = "";
  for (const p of palavras) {
    if ((atual + " " + p).trim().length > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = (atual + " " + p).trim();
  }
  if (atual) linhas.push(atual);
  if (linhas.length > max) {
    const corte = linhas.slice(0, max);
    corte[max - 1] = corte[max - 1].replace(/[.,;:]?$/, "…");
    return corte;
  }
  return linhas;
}

/** SVG com faixa inferior (legenda) e selo no canto. Texto vem do código, não do modelo. */
export function svgSobreposicao({
  legenda = "",
  selo = SELOS.charge,
  largura = 1600,
  altura = 900,
}) {
  const linhas = quebraLinhas(legenda, 52, 2);
  const fonte = 40;
  const entre = fonte * 1.25;
  const faixa = linhas.length ? 90 + entre * linhas.length : 0;
  const yBase = altura - faixa + 70;
  const textos = linhas
    .map(
      (l, i) =>
        `<text x="64" y="${yBase + i * entre}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="${fonte}" font-weight="bold" fill="#ffffff">${escXml(l)}</text>`
    )
    .join("");
  const seloLargura = 40 + Math.round(selo.length * 16.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.82"/>
    </linearGradient>
    <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/></filter>
  </defs>
  ${faixa ? `<rect x="0" y="${altura - faixa - 60}" width="${largura}" height="${faixa + 60}" fill="url(#g)"/>` : ""}
  <g filter="url(#s)">${textos}</g>
  <g transform="translate(${largura - seloLargura - 40}, 36)">
    <rect width="${seloLargura}" height="48" rx="8" fill="#00a859"/>
    <text x="${seloLargura / 2}" y="32" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="22" font-weight="bold" letter-spacing="2" fill="#ffffff">${escXml(selo)}</text>
  </g>
</svg>`;
}

/**
 * Compõe imagem + legenda + selo e devolve WebP 1600×900.
 * `sharp` é importado aqui para o resto do módulo funcionar sem ele.
 */
export async function compor(
  imagem,
  { legenda = "", selo = SELOS.charge, largura = 1600, altura = 900 } = {}
) {
  const sharp = (await import("sharp")).default;
  const svg = Buffer.from(svgSobreposicao({ legenda, selo, largura, altura }));
  return sharp(imagem)
    .resize(largura, altura, { fit: "cover", position: "attention" })
    .composite([{ input: svg, top: 0, left: 0 }])
    .webp({ quality: 84 })
    .toBuffer();
}

/**
 * Pipeline completo para uma matéria: descrever → gerar → compor.
 * `imagemPronta` (Buffer) pula a geração — serve para usar uma arte feita
 * fora (Canva, fotógrafo) e só aplicar legenda + selo.
 */
export async function ilustrar({ titulo, resumo, texto, tipo = "charge", frase, imagemPronta }) {
  const descricao = imagemPronta
    ? { cena: "(imagem fornecida)", legenda: frase ?? titulo, origem: "arquivo" }
    : await descreverCena({ titulo, resumo, texto, tipo });
  if (frase !== undefined) descricao.legenda = frase;
  const gerada = imagemPronta
    ? { imagem: imagemPronta, prompt: null }
    : await gerarImagem(descricao.cena, { tipo });
  const selo = SELOS[tipo] || SELOS.charge;
  const webp = await compor(gerada.imagem, {
    legenda: tipo === "charge" ? descricao.legenda : "",
    selo,
  });
  return { webp, cena: descricao.cena, legenda: descricao.legenda, prompt: gerada.prompt, selo };
}
