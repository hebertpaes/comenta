// =============================================================
// gemini.mjs — API do Gemini (Google AI Studio) para os vídeos do Radar
// =============================================================
// Editor, 29/09/2026: "Use api Gemini 3.8 para gerar os vídeos do radar".
// Três usos, todos com a mesma chave:
//   - vídeo (Veo): cenas ILUSTRATIVAS de 4–8 s para a caixa de vídeo do slide
//     ou para o fundo da cena — cidade, estrada, plantação, urna, prédio
//     público. Nunca pessoa reconhecível, candidato, logotipo, bandeira de
//     partido ou texto: imagem com cara de filmagem de pessoa real é
//     falsificação (Res. TSE 23.610/2019, art. 9º-C). O vídeo gerado sai sempre
//     com o selo "IMAGEM GERADA POR IA" e o rótulo de IA do vídeo passa a citar
//     imagens.
//   - voz (TTS): narrador com voz pronta do Gemini (voz sintética genérica,
//     nunca imitação de pessoa real); a voz de reserva do roteiro assume se a
//     API falhar.
//   - texto: sugere a cena ilustrativa de cada fala (o editor revisa).
//
// Os nomes de modelo mudam; por isso o modelo é DESCOBERTO pela lista da API
// (`listarModelos`), preferindo o que o editor pediu ("3.8") e, sem isso, a
// versão mais nova de cada tipo. Env (todas opcionais menos a chave):
//   GEMINI_API_KEY        chave do AI Studio (configurar no ambiente, nunca no git)
//   GEMINI_API_URL        default https://generativelanguage.googleapis.com
//   GEMINI_MODELO_TEXTO   ex.: o "3.8" pedido; default: o mais novo da lista
//   GEMINI_MODELO_VIDEO   ex.: veo-…; default: o Veo mais novo da lista
//   GEMINI_MODELO_TTS     ex.: …-tts; default: o TTS mais novo da lista
//   GEMINI_PEDIDO         versão preferida quando não há modelo fixo (default "3.8")
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
export const GEMINI_URL = (process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com").replace(/\/+$/, "");
const PEDIDO = process.env.GEMINI_PEDIDO || "3.8";

export class GeminiIndisponivel extends Error {}

function chave() {
  const k = process.env.GEMINI_API_KEY;
  if (!k) {
    throw new GeminiIndisponivel(
      "GEMINI_API_KEY ausente: crie a chave em https://aistudio.google.com/apikey e configure-a como variável de ambiente (nunca no git nem no chat)"
    );
  }
  return k;
}

async function api(caminho, { metodo = "GET", corpo, bruto = false } = {}) {
  const url = /^https?:/.test(caminho) ? caminho : `${GEMINI_URL}/${caminho.replace(/^\/+/, "")}`;
  const r = await fetch(url, {
    method: metodo,
    headers: { "x-goog-api-key": chave(), ...(corpo ? { "content-type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    redirect: "follow",
  });
  if (!r.ok) {
    const txt = (await r.text()).slice(0, 600);
    const erro = new Error(`Gemini ${r.status} em ${url.replace(GEMINI_URL, "")}: ${txt}`);
    erro.status = r.status;
    erro.corpo = txt;
    // chave errada, cota ou serviço fora do ar: quem chama pode usar a reserva
    if ([401, 403, 429, 500, 502, 503, 504].includes(r.status)) Object.setPrototypeOf(erro, GeminiIndisponivel.prototype);
    throw erro;
  }
  return bruto ? r : r.json();
}

// ------------------------------------------------------------------ modelos
export async function listarModelos() {
  const todos = [];
  let pagina = "";
  do {
    const j = await api(`v1beta/models?pageSize=1000${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ""}`);
    todos.push(...(j.models || []));
    pagina = j.nextPageToken || "";
  } while (pagina);
  return todos.map((m) => ({
    id: String(m.name || "").replace(/^models\//, ""),
    nome: m.displayName || "",
    metodos: m.supportedGenerationMethods || [],
    descricao: m.description || "",
  }));
}

/** Tipo de cada modelo pela lista: video (Veo), tts, imagem, texto. */
export function tipoDoModelo(m) {
  const id = m.id.toLowerCase();
  if (id.startsWith("veo") || m.metodos.includes("predictLongRunning")) return "video";
  if (id.includes("tts")) return "tts";
  if (id.includes("image") || id.startsWith("imagen")) return "imagem";
  if (id.includes("embedding") || id.includes("aqa")) return "outro";
  if (id.startsWith("gemini") && m.metodos.includes("generateContent")) return "texto";
  return "outro";
}

/** "gemini-3.8-pro" → [3, 8]; "veo-3.1-generate-preview" → [3, 1]. */
function versao(id) {
  const m = id.match(/(\d+)(?:\.(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] || 0)] : [0, 0];
}
function pontuar(id) {
  const [a, b] = versao(id);
  // estável > preview > experimental; "pro" > "flash" > "lite" no empate
  const canal = /exp/.test(id) ? 0 : /preview/.test(id) ? 1 : 2;
  const porte = /pro/.test(id) ? 2 : /lite/.test(id) ? 0 : 1;
  return a * 1e6 + b * 1e4 + canal * 10 + porte;
}

const FIXO = { texto: "GEMINI_MODELO_TEXTO", video: "GEMINI_MODELO_VIDEO", tts: "GEMINI_MODELO_TTS" };

/** Escolhe o modelo do tipo: o fixado no ambiente, o da versão pedida ou o mais novo. */
export async function escolherModelo(tipo, { pedido = PEDIDO, lista } = {}) {
  const fixo = process.env[FIXO[tipo]];
  if (fixo) return fixo.replace(/^models\//, "");
  const modelos = (lista || (await listarModelos())).filter((m) => tipoDoModelo(m) === tipo);
  if (!modelos.length) throw new GeminiIndisponivel(`nenhum modelo de ${tipo} disponível para esta chave`);
  const ordem = [...modelos].sort((x, y) => pontuar(y.id) - pontuar(x.id));
  const doPedido = pedido && ordem.find((m) => versao(m.id).join(".") === String(pedido));
  return (doPedido || ordem[0]).id;
}

// ------------------------------------------------------------------ regras
/** Nomes de candidatos e figuras do Radar (para barrar prompt de vídeo com gente real). */
function nomesDoRadar() {
  try {
    const d = JSON.parse(readFileSync(join(aqui, "..", "paginas", "radar-dados.json"), "utf8"));
    const nomes = new Set();
    const junta = (v) => {
      if (!v) return;
      if (Array.isArray(v)) return v.forEach(junta);
      if (typeof v === "object") {
        for (const [k, x] of Object.entries(v)) {
          if (["nome", "candidato", "vice", "nome_urna"].includes(k) && typeof x === "string") nomes.add(x);
          else if (typeof x === "object") junta(x);
        }
      }
    };
    junta(d);
    return [...nomes];
  } catch {
    return [];
  }
}
const FIGURAS_FIXAS = ["Lula", "Bolsonaro", "Pivetta", "Wellington", "Mauro Mendes", "Janaina", "Medeiros", "Natasha", "Marçal", "Moraes"];

const sem = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Barra prompt de vídeo que cite pessoa real; devolve o prompt com as regras anexadas. */
export function promptSeguro(prompt) {
  const p = sem(prompt);
  const citados = [...new Set([...FIGURAS_FIXAS, ...nomesDoRadar()])].filter((n) => {
    const partes = sem(n).split(/\s+/).filter((x) => x.length >= 4 && !["silva", "souza", "santos", "costa", "junior", "filho"].includes(x));
    return partes.some((x) => new RegExp(`\\b${x}\\b`).test(p));
  });
  if (citados.length) {
    throw new Error(
      `prompt de vídeo cita pessoa real (${citados.join(", ")}): vídeo gerado por IA não pode mostrar pessoa real (Res. TSE 23.610, art. 9º-C). ` +
        `Use imagem real publicada (redes-post.mjs, com crédito) ou uma cena sem pessoas identificáveis.`
    );
  }
  if (/\b(rosto|face|retrato|close[- ]?up of (a|the) (man|woman|person)|selfie)\b/i.test(prompt)) {
    throw new Error("prompt de vídeo pede rosto em destaque: as cenas geradas não mostram rostos (regra de ilustração do HOJE MT)");
  }
  return `${prompt.trim()}\n\n${REGRAS_VIDEO}`;
}

export const REGRAS_VIDEO =
  "Style: documentary b-roll, natural light, realistic but clearly illustrative, vertical 9:16 framing, slow steady camera. " +
  "Rules: no recognizable people; people only as distant silhouettes, from behind or out of focus; no faces in close-up; " +
  "no politicians or public figures; no text, captions, letters or numbers; no logos, brands or watermarks; " +
  "no party flags or campaign colors (no red banners, no green-and-yellow political symbols); no violence; no crowds cheering.";
export const NEGATIVO_VIDEO =
  "faces, close-up of people, politicians, celebrities, text, subtitles, letters, numbers, logos, watermark, flags, banners, campaign material, violence, weapons, blood";

// ------------------------------------------------------------------ vídeo (Veo)
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Gera um clipe com o Veo e grava em `destino` (mp4) + `destino.json` (registro
 * de proveniência: modelo, prompt, data — vai para o registro do vídeo final).
 */
export async function gerarVideo({ prompt, destino, proporcao = "9:16", duracao, modelo, negativo = NEGATIVO_VIDEO, espera_max_s = 600, intervalo_s = Number(process.env.GEMINI_INTERVALO_S) || 10 }) {
  const texto = promptSeguro(prompt);
  const id = modelo || (await escolherModelo("video"));
  const parametros = { aspectRatio: proporcao, negativePrompt: negativo, personGeneration: "dont_allow" };
  if (duracao) parametros.durationSeconds = Number(duracao);
  let op;
  try {
    op = await api(`v1beta/models/${id}:predictLongRunning`, { metodo: "POST", corpo: { instances: [{ prompt: texto }], parameters: parametros } });
  } catch (e) {
    // alguns modelos não aceitam "dont_allow" ou a duração pedida: tenta sem o
    // parâmetro recusado (as regras do prompt continuam valendo)
    if (e.status === 400 && /personGeneration|durationSeconds|dont_allow/i.test(e.corpo || "")) {
      if (/personGeneration|dont_allow/i.test(e.corpo)) delete parametros.personGeneration;
      if (/durationSeconds/i.test(e.corpo)) delete parametros.durationSeconds;
      op = await api(`v1beta/models/${id}:predictLongRunning`, { metodo: "POST", corpo: { instances: [{ prompt: texto }], parameters: parametros } });
    } else throw e;
  }
  const nome = op.name; // consulta sempre pelo nome devolvido na criação
  const inicio = Date.now();
  while (!op.done) {
    if ((Date.now() - inicio) / 1000 > espera_max_s) throw new GeminiIndisponivel(`Veo não terminou em ${espera_max_s} s (${nome})`);
    await espera(intervalo_s * 1000);
    op = await api(`v1beta/${nome}`);
  }
  if (op.error) throw new Error(`Veo recusou: ${JSON.stringify(op.error).slice(0, 400)}`);
  const resp = op.response?.generateVideoResponse || op.response || {};
  const amostra = (resp.generatedSamples || resp.generatedVideos || [])[0];
  const uri = amostra?.video?.uri;
  if (!uri) {
    const filtro = resp.raiMediaFilteredReasons || resp.raiMediaFilteredCount;
    throw new Error(`Veo não devolveu vídeo${filtro ? ` (filtro de segurança: ${JSON.stringify(filtro)})` : ""}`);
  }
  const r = await api(uri, { bruto: true });
  writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  const registro = { sintetico: true, gerador: "Google Veo (API do Gemini)", modelo: id, prompt: prompt.trim(), regras: REGRAS_VIDEO, negativo, proporcao, gerado_em: new Date().toISOString() };
  writeFileSync(`${destino}.json`, JSON.stringify(registro, null, 2) + "\n");
  return { arquivo: destino, ...registro };
}

// ------------------------------------------------------------------ voz (TTS)
function wav(pcm, taxa = 24000) {
  const cab = Buffer.alloc(44);
  cab.write("RIFF", 0);
  cab.writeUInt32LE(36 + pcm.length, 4);
  cab.write("WAVEfmt ", 8);
  cab.writeUInt32LE(16, 16);
  cab.writeUInt16LE(1, 20); // PCM
  cab.writeUInt16LE(1, 22); // mono
  cab.writeUInt32LE(taxa, 24);
  cab.writeUInt32LE(taxa * 2, 28);
  cab.writeUInt16LE(2, 32);
  cab.writeUInt16LE(16, 34);
  cab.write("data", 36);
  cab.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([cab, pcm]);
}

/**
 * Voz pronta do Gemini (ex.: "Charon", "Orus", "Kore"): grava wav mono em
 * `destino`. `estilo` (opcional) é a instrução de leitura que vai antes do
 * texto, ex.: "Leia em português do Brasil, em tom de telejornal, ritmo ágil".
 */
export async function gerarVoz({ texto, destino, voz = "Charon", modelo, estilo = "" }) {
  const id = modelo || (await escolherModelo("tts"));
  const conteudo = estilo ? `${estilo.trim().replace(/[:.]?$/, ":")}\n${texto.trim()}` : texto.trim();
  const j = await api(`v1beta/models/${id}:generateContent`, {
    metodo: "POST",
    corpo: {
      contents: [{ parts: [{ text: conteudo }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } } },
    },
  });
  const parte = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
  if (!parte) throw new GeminiIndisponivel(`TTS sem áudio na resposta (${JSON.stringify(j).slice(0, 200)})`);
  const mime = parte.inlineData.mimeType || "";
  const bytes = Buffer.from(parte.inlineData.data, "base64");
  const taxa = Number((mime.match(/rate=(\d+)/) || [])[1]) || 24000;
  writeFileSync(destino, /wav/.test(mime) ? bytes : wav(bytes, taxa));
  return { arquivo: destino, modelo: id, voz };
}

// ------------------------------------------------------------------ texto
/** Pergunta simples ao modelo de texto (JSON quando `json: true`). */
export async function perguntar(texto, { modelo, json = false, sistema } = {}) {
  const id = modelo || (await escolherModelo("texto"));
  const j = await api(`v1beta/models/${id}:generateContent`, {
    metodo: "POST",
    corpo: {
      ...(sistema ? { systemInstruction: { parts: [{ text: sistema }] } } : {}),
      contents: [{ role: "user", parts: [{ text: texto }] }],
      generationConfig: json ? { responseMimeType: "application/json" } : {},
    },
  });
  const saida = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  return { modelo: id, texto: json ? JSON.parse(saida) : saida };
}
