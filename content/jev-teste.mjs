#!/usr/bin/env node
// =============================================================
// jev-teste.mjs — teste de fumaça do Jev (TypeSafe) com um caso da redação
// =============================================================
//
//   node jev-teste.mjs --dry-run            monta e imprime o pedido, sem chave
//   node jev-teste.mjs                      chama a API (precisa de TYPESAFE_API_KEY)
//   node jev-teste.mjs --texto="..."        usa outro texto como estado
//   node jev-teste.mjs --modelos            lista os modelos da conta
//
// O caso: uma curta fictícia passa por três perguntas independentes numa
// chamada só — editoria (choice), presença de fala entre aspas atribuída a
// pessoa nomeada (noul) e grau de acusação contra pessoa nomeada (score).
// São as checagens que o editor faz à mão antes de publicar ("balão só com
// fala real citada na curta"; "não ataque ninguém"). Aqui o Jev só responde;
// quem decide continua sendo o editor.
import {
  JevIndisponivel,
  VERSAO_SDK,
  choice,
  listarModelos,
  modeloPadrao,
  montarPedido,
  noul,
  perguntar,
  resumo,
  score,
} from "./lib/jev.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const TEXTO_PADRAO =
  "A Câmara Municipal de Cuiabá aprovou nesta terça-feira (30) o projeto que amplia o horário das creches " +
  "municipais. Segundo a vereadora Ana Souza, autora do projeto, \"a mãe que trabalha à noite não pode ficar sem " +
  "vaga\". A prefeitura diz que ainda vai avaliar o custo da medida.";

const estado = {
  titulo: args.titulo || "Câmara amplia horário das creches",
  texto: typeof args.texto === "string" ? args.texto : TEXTO_PADRAO,
};

const perguntas = {
  editoria: choice("Em qual editoria do HOJE MT a matéria (`titulo` e `texto`) se encaixa melhor?", {
    politica: "Política estadual ou municipal: Assembleia, Câmara, governo, prefeituras, tribunais de contas",
    cidades: "Serviços, obras, trânsito e cotidiano das cidades de Mato Grosso",
    eleicoes: "Campanha, candidatos, pesquisas e Justiça Eleitoral",
    mundo: "Brasil (fora de MT) e internacional",
    opiniao: "Artigo assinado, análise ou editorial",
  }),
  tem_aspas: noul("O `texto` traz fala entre aspas atribuída a uma pessoa nomeada?", {
    true: "Há trecho entre aspas com a pessoa que disse identificada pelo nome",
    false: "Não há aspas, ou a fala não é atribuída a pessoa nomeada",
  }),
  acusacao: score("Qual o grau de acusação contra pessoa nomeada no `texto`?", [
    "Nenhuma: só relata fatos, decisões ou opiniões sem imputar conduta a alguém",
    "Leve: critica atuação ou decisão de pessoa nomeada, sem atribuir crime ou irregularidade",
    "Grave: atribui crime, irregularidade ou desonestidade a pessoa nomeada",
  ]),
};

console.log(`SDK @typesafe-ai/sdk ${VERSAO_SDK} · modelo padrão ${modeloPadrao()}`);

try {
  if (args.modelos) {
    console.log(JSON.stringify(await listarModelos(), null, 1));
    process.exit(0);
  }
  if (args["dry-run"]) {
    console.log(JSON.stringify(montarPedido(estado, perguntas), null, 1));
    console.log("\n(pedido válido; nada foi enviado)");
    process.exit(0);
  }
  const r = await perguntar(estado, perguntas);
  console.log(resumo(r));
} catch (e) {
  if (e instanceof JevIndisponivel) {
    console.error(`Jev indisponível: ${e.message}`);
    process.exit(2);
  }
  console.error(`erro: ${e.constructor?.name || "Error"}: ${e.message}`);
  process.exit(1);
}
