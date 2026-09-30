// =============================================================
// jev.mjs — Jev (TypeSafe): julgamentos tipados para o robô do HOJE MT
// =============================================================
// Editor, 30/09/2026: "instale o jev"
// (https://typesafe.ai/blog/introducing-system-one-models-and-jev).
//
// O Jev é um "System One model": em vez de gerar texto, responde perguntas
// fechadas sobre um estado (texto ou JSON) com respostas TIPADAS e
// probabilidades calibradas. Três tipos de pergunta, todos numa só chamada:
//   - choice(instrucao, {rotulo: descricao, ...})  → um rótulo entre os dados,
//     com `probabilities` por rótulo e `confidence` (0 a 1);
//   - noul(instrucao, {true: ..., false: ...}?)     → probabilidade de "sim"
//     (`noul`, 0 a 1; não tem confidence separada);
//   - score(instrucao, [nivel0, nivel1, ...])       → nota esperada entre
//     níveis descritos (2 a 10), com `legend`, `probabilities` e `confidence`.
// O código continua dono do fluxo: o Jev não escreve, não publica e não
// decide sozinho. Toda saída é um dado para o script (ou para o editor) usar.
//
// Uso:
//   import { perguntar, choice, noul, score, resumo } from "./lib/jev.mjs";
//   const r = await perguntar({ titulo, texto }, {
//     editoria: choice("Em qual editoria a matéria em `texto` se encaixa?", {
//       politica: "Assembleia, Câmara, governo, tribunais", cidades: "Serviços, obras e cotidiano das cidades" }),
//     tem_aspas: noul("O `texto` traz fala entre aspas atribuída a pessoa nomeada?"),
//   });
//   (exemplo completo, com as três perguntas: jev-teste.mjs)
//   r.answers.editoria.choice, r.answers.editoria.confidence, r.answers.tem_aspas.noul
//
// Limites e custos (docs.typesafe.ai/models, lidos em 30/09/2026): 64 mil
// tokens por pedido (32 mil para o estado mais a pergunta mais longa); só
// texto; US$ 0,042 por milhão de tokens de entrada, saída grátis; 40 pedidos
// e 100 mil tokens por segundo. O inglês é a língua principal do treino; as
// outras línguas "são atendidas, mas não igualmente bem" (a doc não cita o
// português): testar nos nossos textos antes de confiar num limiar.
//
// Env (só a chave é obrigatória; configurar no ambiente, nunca no git):
//   TYPESAFE_API_KEY        chave de https://console.typesafe.ai/keys
//   TYPESAFE_BASE_URL       default https://api.typesafe.ai
//   TYPESAFE_DEFAULT_MODEL  default jev-latest (alias da versão estável)
//   TYPESAFE_LOG_LEVEL      debug | info | warn (default) | error | off
//                           (debug imprime o corpo do pedido, isto é, o texto da matéria, e os 4
//                           últimos caracteres da chave; não usar em log compartilhado nem colar no chat)
// Os scripts rodam com o mesmo prefixo dos demais (NODE_USE_ENV_PROXY=1 e
// NODE_EXTRA_CA_CERTS), porque o SDK usa o `fetch` global do Node.
import {
  APIConnectionError,
  AuthenticationError,
  ENV,
  RateLimitError,
  TypeSafeClient,
  VERSION,
  choice,
  noul,
  score,
} from "@typesafe-ai/sdk";

export { choice, noul, score, VERSION as VERSAO_SDK };

export const MODELO_PADRAO = "jev-latest";

export class JevIndisponivel extends Error {}

/** Chave da API ou erro explicando onde configurar (nunca pedir no chat). */
export function chaveJev() {
  const k = process.env[ENV.apiKey];
  if (!k) {
    throw new JevIndisponivel(
      `${ENV.apiKey} não definida. Crie a chave em https://console.typesafe.ai/keys e ` +
        "configure na aba de ambiente (variável de ambiente), não no repositório nem no chat."
    );
  }
  return k;
}

/** Modelo que a chamada vai usar sem `modelo` explícito. */
export const modeloPadrao = () => process.env[ENV.defaultModel]?.trim() || MODELO_PADRAO;

/**
 * Confere as perguntas antes de gastar tokens: cada uma tem de vir de
 * choice()/noul()/score(). Limites da API: choice até 255 rótulos; score de 2
 * a 10 níveis. Regra nossa, não da API: choice com pelo menos 2 rótulos (um
 * choice de 1 opção não decide nada). Lança Error com o id da pergunta.
 */
export function validarPerguntas(perguntas) {
  if (!perguntas || typeof perguntas !== "object" || Array.isArray(perguntas) || !Object.keys(perguntas).length) {
    throw new Error("perguntas: passe um objeto não vazio {id: choice()|noul()|score()}");
  }
  for (const [id, q] of Object.entries(perguntas)) {
    if (!q || typeof q !== "object") throw new Error(`pergunta "${id}": use choice(), noul() ou score()`);
    if (q.type === "choice") {
      const n = q.criteria && typeof q.criteria === "object" && !Array.isArray(q.criteria) ? Object.keys(q.criteria).length : 0;
      if (n < 2) throw new Error(`pergunta "${id}": o helper exige pelo menos 2 rótulos em criteria no choice`);
      if (n > 255) throw new Error(`pergunta "${id}": choice aceita no máximo 255 rótulos (tem ${n})`);
    } else if (q.type === "score") {
      const n = Array.isArray(q.criteria) ? q.criteria.length : 0;
      if (n < 2 || n > 10) throw new Error(`pergunta "${id}": score precisa de 2 a 10 níveis em criteria (tem ${n})`);
    } else if (q.type !== "noul") {
      throw new Error(`pergunta "${id}": tipo desconhecido "${q.type}"`);
    }
  }
  return perguntas;
}

/** Corpo do POST /v1/systemone, para conferir sem chamar a API (--dry-run). */
export function montarPedido(estado, perguntas, modelo) {
  validarPerguntas(perguntas);
  return { state: estado, questions: perguntas, model: modelo || modeloPadrao() };
}

let _cliente;

/**
 * Cliente do SDK. Sem `config`, reaproveita uma instância única; com config
 * (ex.: {timeout, retry, logLevel}), cria uma nova só para essa chamada.
 * Timeout padrão de 15 s por tentativa; o SDK repete 2 vezes em 408/429/5xx.
 */
export function cliente(config = {}) {
  const proprio = Object.keys(config).length > 0;
  if (!proprio && _cliente) return _cliente;
  const c = new TypeSafeClient({ timeout: 15_000, ...config, apiKey: config.apiKey || chaveJev() });
  if (!proprio) _cliente = c;
  return c;
}

/**
 * Faz UMA chamada com todas as perguntas sobre o mesmo estado (elas rodam em
 * paralelo no modelo e não veem as respostas umas das outras). Devolve o
 * resultado do SDK: { model, answers: {id: resposta}, usage }.
 * Erros de chave viram JevIndisponivel; os demais sobem como estão
 * (RateLimitError, APIConnectionError, UnprocessableEntityError, ...).
 */
export async function perguntar(estado, perguntas, { modelo, opcoes, config } = {}) {
  validarPerguntas(perguntas);
  const pedido = { state: estado, questions: perguntas };
  if (modelo) pedido.model = modelo;
  try {
    return await cliente(config).systemOne(pedido, opcoes);
  } catch (e) {
    if (e instanceof AuthenticationError) {
      throw new JevIndisponivel(`a API recusou a ${ENV.apiKey} (401): confira a chave no ambiente`, { cause: e });
    }
    throw e;
  }
}

/** Modelos disponíveis para a conta (GET /v1/models): [{name, description, release_date}]. */
export async function listarModelos(config) {
  const c = cliente(config);
  if (!c.models || typeof c.models.list !== "function") throw new Error("o SDK instalado não expõe client.models.list()");
  return await c.models.list(); // o SDK 0.6 já devolve o array de ModelCard (ou lança)
}

const pct = (x) => `${Math.round(Number(x) * 100)}%`;
const dist = (p) =>
  Object.entries(p || {})
    .sort((x, y) => y[1] - x[1])
    .map(([k, v]) => `${k} ${pct(v)}`)
    .join(", ");

/** Uma linha por resposta, para log e para o editor ler. */
export function resumo(resposta) {
  const linhas = [];
  for (const [id, a] of Object.entries(resposta?.answers || {})) {
    if (a.type === "choice") {
      linhas.push(`${id}: ${a.choice} (confiança ${pct(a.confidence)}; ${dist(a.probabilities)})`);
    } else if (a.type === "noul") {
      linhas.push(`${id}: sim ${pct(a.noul)}`);
    } else if (a.type === "score") {
      const nivel = a.legend?.[Math.round(a.score)];
      linhas.push(`${id}: ${Number(a.score).toFixed(2)}${nivel ? ` (≈ ${typeof nivel === "string" ? nivel : JSON.stringify(nivel)})` : ""} (confiança ${pct(a.confidence)}; ${dist(a.probabilities)})`);
    } else {
      linhas.push(`${id}: ${JSON.stringify(a)}`);
    }
  }
  if (resposta?.usage) linhas.push(`tokens: ${resposta.usage.input_tokens} entrada, ${resposta.usage.output_tokens} saída · modelo ${resposta.model}`);
  return linhas.join("\n");
}

/** Erros que valem repetir mais tarde (limite de taxa, rede), para o chamador decidir. */
export const erroTransitorio = (e) => e instanceof RateLimitError || e instanceof APIConnectionError;
