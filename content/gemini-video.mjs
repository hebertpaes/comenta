#!/usr/bin/env node
// =============================================================
// gemini-video.mjs — API do Gemini para os vídeos do Radar (lib/gemini.mjs)
// =============================================================
//   node gemini-video.mjs modelos
//        lista os modelos da chave por tipo (texto, vídeo, TTS) e diz qual
//        seria escolhido (o "3.8" pedido pelo editor, se existir)
//   node gemini-video.mjs cena --prompt="Avenida do CPA em Cuiabá ao entardecer" --saida=clipe.mp4 [--duracao=8] [--proporcao=9:16] [--modelo=]
//        gera um clipe ilustrativo com o Veo (sem pessoas reconhecíveis; ver
//        regras em lib/gemini.mjs) + clipe.mp4.json com a proveniência
//   node gemini-video.mjs voz --texto="…" --saida=fala.wav [--voz=Charon] [--estilo="…"] [--modelo=]
//        fala do narrador com voz pronta do Gemini
//   node gemini-video.mjs sugerir <roteiro.cena.json> [--saida=sugestoes.json]
//        o modelo de texto propõe uma cena ilustrativa (prompt do Veo) por fala;
//        o editor revisa antes de gerar (nada é gerado aqui)
//
// No charge-cena.mjs: `voz.motor: "gemini"` (com `reserva`) e, na cena,
// `clipe.gerar: {prompt, duracao?}` no lugar de `clipe.arquivo`.
// A chave vem de GEMINI_API_KEY (ambiente); nunca no git nem no chat.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { escolherModelo, gerarVideo, gerarVoz, GeminiIndisponivel, listarModelos, perguntar, tipoDoModelo } from "./lib/gemini.mjs";

const args = {};
const livres = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=([\s\S]*))?$/);
  if (m) args[m[1]] = m[2] ?? true;
  else livres.push(a);
}
const [comando, ...resto] = livres;

async function modelos() {
  const lista = await listarModelos();
  const grupos = {};
  for (const m of lista) (grupos[tipoDoModelo(m)] ||= []).push(m.id);
  for (const tipo of ["texto", "video", "tts", "imagem"]) {
    const ids = grupos[tipo] || [];
    let escolhido = "—";
    try {
      if (tipo !== "imagem") escolhido = await escolherModelo(tipo, { lista });
    } catch {}
    console.log(`${tipo.padEnd(7)} ${ids.length} modelo(s); escolhido: ${escolhido}`);
    for (const id of ids.sort()) console.log(`   ${id}`);
  }
  const pedido = lista.filter((m) => /3\.8/.test(m.id));
  console.log(pedido.length ? `\n"3.8" na lista: ${pedido.map((m) => m.id).join(", ")}` : `\nnenhum modelo "3.8" nesta chave; uso o mais novo de cada tipo`);
}

async function sugerir(arquivo) {
  const spec = JSON.parse(readFileSync(resolve(arquivo), "utf8"));
  const falas = (spec.cenas || []).map((c, i) => ({ n: c.n ?? i + 1, fala: c.fala || c.legenda || "" })).filter((c) => c.fala);
  const sistema =
    "Você é editor de imagem de um portal de notícias de Mato Grosso. Para cada fala de um boletim eleitoral em vídeo, proponha UMA cena ilustrativa curta " +
    "para um gerador de vídeo (Veo), em inglês, 1 frase. Regras: nenhuma pessoa reconhecível, nenhum político ou pessoa real, nenhum texto, número, " +
    "logotipo, bandeira ou cor de campanha; paisagens, cidades e rotinas de Mato Grosso (Cuiabá, Várzea Grande, Sinop, Rondonópolis, Pantanal, " +
    "lavouras, estradas, prédios públicos vistos de fora, urna eletrônica genérica). Se a fala for sobre número de pesquisa ou decisão judicial, " +
    'responda prompt null (o slide com o dado já basta). Responda JSON: [{"n":1,"prompt":"..."|null,"motivo":"..."}].';
  const { modelo, texto } = await perguntar(JSON.stringify(falas), { json: true, sistema });
  const saida = { roteiro: arquivo, modelo, gerado_em: new Date().toISOString(), revisar: true, cenas: texto };
  const destino = args.saida || resolve(arquivo).replace(/\.cena\.json$/, "") + ".sugestoes-gemini.json";
  writeFileSync(destino, JSON.stringify(saida, null, 2) + "\n");
  console.log(JSON.stringify(saida, null, 2));
  console.log(`\ngravado em ${destino} — revise antes de copiar para clipe.gerar`);
}

try {
  if (comando === "modelos") await modelos();
  else if (comando === "cena") {
    if (!args.prompt || !args.saida) throw new Error("uso: cena --prompt=… --saida=clipe.mp4");
    const r = await gerarVideo({ prompt: args.prompt, destino: resolve(args.saida), duracao: args.duracao, proporcao: args.proporcao || "9:16", modelo: args.modelo });
    console.log(JSON.stringify(r, null, 2));
  } else if (comando === "voz") {
    const texto = args.texto === true || !args.texto ? readFileSync(0, "utf8") : args.texto;
    if (!texto.trim() || !args.saida) throw new Error("uso: voz --texto=… --saida=fala.wav (ou o texto pela entrada padrão)");
    const r = await gerarVoz({ texto, destino: resolve(args.saida), voz: args.voz || "Charon", estilo: args.estilo || "", modelo: args.modelo });
    console.log(JSON.stringify(r));
  } else if (comando === "sugerir") {
    if (!resto[0]) throw new Error("uso: sugerir <roteiro.cena.json>");
    await sugerir(resto[0]);
  } else {
    console.error("uso: node gemini-video.mjs modelos | cena | voz | sugerir (ver cabeçalho)");
    process.exit(1);
  }
} catch (e) {
  console.error(e.message);
  // 3 = serviço/chave indisponível (quem chama usa a reserva); 1 = erro de uso ou regra
  process.exit(e instanceof GeminiIndisponivel ? 3 : 1);
}
