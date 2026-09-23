// =============================================================
// ilustrar.mjs — ilustração REALISTA para Curtas (charges) e matérias sem foto
// =============================================================
// Substitui a charge vetorial (bonecos geométricos) por uma cena desenhada:
//   1. um modelo de texto lê a matéria e descreve UMA cena + a frase curta da
//      charge + a lista de figuras públicas citadas (os "personagens");
//   2. para cada personagem, procura uma FOTO REAL COM LICENÇA (Wikimedia
//      Commons: Câmara, Senado, TSE, Planalto…) e a entrega ao modelo de
//      imagem como referência, para desenhá-lo reconhecível (caricatura);
//   3. o modelo de imagem desenha a cena em 16:9;
//   4. o `sharp` compõe, por código, a frase (legenda) e o selo
//      "CHARGE · HOJE MT" / "ILUSTRAÇÃO · HOJE MT" — texto em português com
//      acento fica certo porque não passa pelo modelo de imagem.
//
// Regra editorial (content/README.md):
//   - charge: personagem público é DESENHADO (caricatura) a partir de foto
//     licenciada; o resultado tem de parecer desenho, nunca foto; o selo
//     CHARGE vai queimado na imagem; nada de crime, violência ou humilhação
//     atribuídos ao personagem — a ironia fica no gesto e na situação.
//   - ilustracao (aparência fotográfica): NENHUMA pessoa real reconhecível,
//     porque uma imagem com cara de foto de pessoa real é falsificação.
//
// Env:
//   GEMINI_API_KEY        obrigatória para gerar (sem ela, só `compor` funciona)
//   GEMINI_API_URL        default https://generativelanguage.googleapis.com
//   BLOG_IMAGEM_MODELO    default gemini-2.5-flash-image
//   BLOG_TEXTO_MODELO     default gemini-2.5-flash
import { buscar } from "./imagens.mjs";

const GEMINI_URL = (
  process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com"
).replace(/\/+$/, "");
const MODELO_IMAGEM = process.env.BLOG_IMAGEM_MODELO || "gemini-2.5-flash-image";
const MODELO_TEXTO = process.env.BLOG_TEXTO_MODELO || "gemini-2.5-flash";
const UA = "HojeMT-redacao/1.0 (+https://hojemt.com.br)";
const MAX_PERSONAGENS = 3;

/** Guia de estilo por tipo de peça. O modelo de imagem recebe isto + a cena. */
export const ESTILO = {
  charge:
    "Editorial cartoon (charge) for a Brazilian newspaper, in the tradition of Brazilian press cartoonists: hand-drawn look with clean ink lines and watercolor-style digital painting, expressive exaggerated caricatures, warm light, detailed believable background, wide 16:9 composition. Public figures are drawn as recognizable caricatures faithful to the attached reference photos (head shape, hairline, beard, glasses, build, usual clothing), exaggerated with humor but never grotesque or demeaning. It must read as a drawing, never as a photograph.",
  ilustracao:
    "Photorealistic editorial photograph look: 35mm lens, shallow depth of field, natural light, documentary framing, wide 16:9 composition.",
};

/** Restrições comuns e as específicas de cada tipo. */
export const RESTRICOES_COMUNS =
  "No text, no letters, no numbers, no signs, no logos, no watermarks. No real political party flags; any flag or banner is plain white or neutral, never red and never green-and-yellow as a political symbol. No violence, no gore, no nudity.";
export const RESTRICOES = {
  charge:
    "Only the people given as reference photos may be recognizable; everyone else is generic. Keep each referenced person's ethnicity, age, gender and body as in the photo. Do not show them committing crimes, being hurt, humiliated or in sexual situations.",
  ilustracao:
    "No recognizable real-world faces or public figures: people are generic, seen from behind, in profile or out of focus.",
};

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

/** Normaliza personagem vindo do modelo ou da linha de comando. */
function limpaPersonagem(p) {
  if (!p) return null;
  const nome = String(typeof p === "string" ? p : p.nome || "")
    .replace(/\s+/g, " ")
    .trim();
  if (nome.length < 3) return null;
  return {
    nome,
    cargo: String((typeof p === "object" && p.cargo) || "").trim(),
    papel: String((typeof p === "object" && p.papel) || "").trim(),
  };
}

/**
 * Lê a matéria e devolve { cena, legenda, personagens }: a cena em inglês (o
 * modelo de imagem entende melhor), a frase da charge em português e as
 * figuras públicas citadas que aparecem na cena (só para charge).
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
    personagens: [],
    origem: "fallback",
  };
  if (!chave) return fallback;

  const regrasPessoas =
    tipo === "charge"
      ? [
          "Refira-se às figuras públicas da matéria pelo nome na cena (ex.: 'Mayor Abilio Brunini, bald, in a suit, ...').",
          `personagens: lista (no máximo ${MAX_PERSONAGENS}) SÓ de figuras públicas (políticos, autoridades, dirigentes) citadas NA MATÉRIA e que apareçam na cena:`,
          '[{"nome": "nome como é conhecido", "cargo": "cargo atual", "papel": "o que faz na cena"}]. Lista vazia se não houver.',
          "Pessoas comuns (servidores, crianças, eleitores) não entram na lista e aparecem genéricas.",
          "PROIBIDO: texto/placas/logos dentro da imagem, símbolos de partido, violência, e cena que mostre o personagem cometendo crime ou humilhado — a ironia fica no gesto e na situação que a matéria descreve.",
        ]
      : [
          "PROIBIDO: nomes ou rostos de pessoas reais (esta peça tem aparência de foto), texto/placas/logos dentro da imagem, símbolos de partido.",
          "Pessoas aparecem de costas, de perfil ou desfocadas. Sem violência.",
          "personagens: sempre lista vazia [].",
        ];

  const prompt = [
    `Você é o ${tipo === "charge" ? "chargista" : "ilustrador"} de um jornal de Mato Grosso. Leia a matéria e responda SÓ com JSON:`,
    '{"cena": "...", "legenda": "...", "personagens": [...]}',
    "",
    `cena: descrição em INGLÊS (60 a 120 palavras) de UMA cena ${tipo === "charge" ? "de charge" : "realista"} que represente a matéria,`,
    "com lugar plausível em Mato Grosso (Cuiabá, Várzea Grande, Sinop, interior, Assembleia, rua, fazenda…),",
    "hora do dia, luz, o que cada pessoa está fazendo e objetos que contam a história.",
    ...regrasPessoas,
    tipo === "charge"
      ? "legenda: a frase da charge, em português, com ironia leve, no máximo 90 caracteres."
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
    const personagens =
      tipo === "charge" && Array.isArray(j.personagens)
        ? j.personagens.map(limpaPersonagem).filter(Boolean).slice(0, MAX_PERSONAGENS)
        : [];
    return {
      cena,
      legenda:
        tipo === "charge"
          ? String(j.legenda || fallback.legenda)
              .trim()
              .slice(0, 110)
          : "",
      personagens,
      origem: MODELO_TEXTO,
    };
  } catch (e) {
    console.warn(`  descrição por IA falhou (${e.message}); usando título + resumo`);
    return fallback;
  }
}

const semAcento = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Escolhe, entre os resultados, a foto que mais parece retrato da pessoa. */
export function escolherRetrato(nome, imagens) {
  const partes = semAcento(nome)
    .split(/\s+/)
    .filter((p) => p.length > 2);
  const sobrenome = partes.at(-1) || "";
  let melhor = null;
  let melhorNota = -1;
  for (const im of imagens) {
    const t = semAcento(`${im.titulo || ""} ${im.descricao || ""}`);
    let nota = 0;
    if (partes.every((p) => t.includes(p)))
      nota += 4; // nome completo no título
    else if (sobrenome && t.includes(sobrenome)) nota += 2;
    if (/retrato|portrait|oficial|official|deputad|senador|prefeit|governador|tse/i.test(t))
      nota += 1;
    if (im.altura && im.largura && im.altura >= im.largura * 0.9) nota += 1; // vertical = retrato
    if (/\.(jpe?g|png|webp)$/i.test(im.url || "")) nota += 0.5;
    if (nota > melhorNota) {
      melhorNota = nota;
      melhor = im;
    }
  }
  return melhorNota >= 2 ? melhor : null;
}

/** Baixa e reduz a foto (lado maior ≤ 1024) para mandar ao modelo. */
async function baixarReferencia(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const bruto = Buffer.from(await r.arrayBuffer());
  try {
    const sharp = (await import("sharp")).default;
    return {
      imagem: await sharp(bruto)
        .rotate()
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer(),
      mime: "image/jpeg",
    };
  } catch {
    return { imagem: bruto, mime: r.headers.get("content-type") || "image/jpeg" };
  }
}

/**
 * Para cada personagem, procura foto real com licença (padrão: Wikimedia
 * Commons) e devolve [{ nome, cargo, imagem, mime, credito, pagina, licenca }].
 * Quem não tiver foto licenciada fica de fora (será desenhado genérico).
 */
export async function buscarReferencias(personagens, { bancos = ["wikimedia"], n = 8 } = {}) {
  const refs = [];
  for (const p of (personagens || [])
    .map(limpaPersonagem)
    .filter(Boolean)
    .slice(0, MAX_PERSONAGENS)) {
    try {
      const { imagens } = await buscar(p.nome, { n, bancos });
      const foto = escolherRetrato(p.nome, imagens);
      if (!foto) {
        console.warn(`  sem foto licenciada para ${p.nome}; será desenhado genérico`);
        continue;
      }
      const { imagem, mime } = await baixarReferencia(foto.url);
      refs.push({
        nome: p.nome,
        cargo: p.cargo,
        imagem,
        mime,
        credito: foto.credito,
        pagina: foto.pagina || foto.url,
        licenca: foto.licenca,
      });
    } catch (e) {
      console.warn(`  foto de ${p.nome} falhou (${e.message}); será desenhado genérico`);
    }
  }
  return refs;
}

/** Monta o prompt final de imagem: estilo + cena + restrições. */
export function promptImagem(cena, tipo = "charge") {
  const t = ESTILO[tipo] ? tipo : "charge";
  return `${ESTILO[t]}\n\nScene: ${cena}\n\n${RESTRICOES_COMUNS} ${RESTRICOES[t]}`;
}

/**
 * Gera a imagem 16:9 no Gemini. `referencias` (só charge) são as fotos dos
 * personagens, enviadas junto do prompt. Devolve { imagem: Buffer, mime, prompt }.
 */
export async function gerarImagem(
  cena,
  { tipo = "charge", chave = process.env.GEMINI_API_KEY, referencias = [] } = {}
) {
  if (!chave)
    throw new Error("GEMINI_API_KEY ausente: crie uma em https://aistudio.google.com/apikey");
  const prompt = promptImagem(cena, tipo);
  const parts = [{ text: prompt }];
  if (tipo === "charge")
    for (const r of referencias) {
      parts.push({
        text: `Reference photo of ${r.nome}${r.cargo ? ` (${r.cargo})` : ""}: draw this person in the scene as a recognizable caricature, in the drawing style above.`,
      });
      parts.push({
        inlineData: { mimeType: r.mime || "image/jpeg", data: r.imagem.toString("base64") },
      });
    }
  const r = await gemini(
    MODELO_IMAGEM,
    {
      contents: [{ parts }],
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
 * Pipeline completo para uma matéria: descrever → fotos dos personagens →
 * gerar → compor.
 *   imagemPronta (Buffer)  pula a geração — arte feita fora; só legenda + selo.
 *   personagens            lista fixa [{nome, cargo}] em vez da sugerida pela IA.
 *   referencias            fotos já escolhidas [{nome, cargo, imagem, mime, credito}]
 *                          (pula a busca no banco de imagens).
 *   semPersonagens         desenha todo mundo genérico, como antes.
 */
export async function ilustrar({
  titulo,
  resumo,
  texto,
  tipo = "charge",
  frase,
  imagemPronta,
  personagens,
  referencias,
  semPersonagens = false,
}) {
  const descricao = imagemPronta
    ? { cena: "(imagem fornecida)", legenda: frase ?? titulo, personagens: [], origem: "arquivo" }
    : await descreverCena({ titulo, resumo, texto, tipo });
  if (frase !== undefined) descricao.legenda = frase;

  let refs = [];
  if (!imagemPronta && tipo === "charge" && !semPersonagens) {
    const lista = personagens ?? descricao.personagens;
    refs = referencias ?? (await buscarReferencias(lista));
  }

  const gerada = imagemPronta
    ? { imagem: imagemPronta, prompt: null }
    : await gerarImagem(descricao.cena, { tipo, referencias: refs });
  const selo = SELOS[tipo] || SELOS.charge;
  const webp = await compor(gerada.imagem, {
    legenda: tipo === "charge" ? descricao.legenda : "",
    selo,
  });
  return {
    webp,
    cena: descricao.cena,
    legenda: descricao.legenda,
    prompt: gerada.prompt,
    selo,
    personagens: refs.map(({ nome, cargo, credito, pagina, licenca }) => ({
      nome,
      cargo,
      credito,
      pagina,
      licenca,
    })),
  };
}
