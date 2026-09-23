#!/usr/bin/env node
// =============================================================
// ilustrar.mjs — troca a charge vetorial de um post do Ghost por uma
// ilustração realista (Gemini + sharp), com legenda e selo por código.
// =============================================================
//
//   node ilustrar.mjs --slug=rua-livre-amigo              gera e salva em ./saida/<slug>.webp (não mexe no Ghost)
//   node ilustrar.mjs --slug=rua-livre-amigo --publicar   gera, envia ao Ghost e troca a feature_image do post
//   node ilustrar.mjs --curtas [--publicar]               todos os posts da tag "curtas" que ainda usam charge-*.webp
//
// Opções:
//   --frase="..."        legenda fixa (em vez da sugerida pela IA)
//   --imagem=arte.png    pula a geração: só compõe legenda + selo e (se --publicar) envia
//   --tipo=charge|ilustracao   selo e estilo (default: charge)
//   --saida=dir          pasta dos arquivos gerados (default: ./saida)
//   --limite=N           com --curtas, no máximo N posts (default: todos)
//
// Personagens (só charge): a IA lista as figuras públicas da matéria, o script
// procura a foto real com licença de cada uma (Wikimedia Commons) e o modelo
// de imagem as desenha reconhecíveis (caricatura). Para controlar:
//   --personagens="Abilio Brunini (prefeito de Cuiabá);Fulano (vereador)"  lista fixa
//   --referencias="Abilio Brunini=fotos/abilio.jpg,Fulano=fotos/fulano.png" fotos já escolhidas
//   --sem-personagens    todo mundo genérico (de costas/perfil), como antes
//
// Env: GHOST_ADMIN_URL, GHOST_ADMIN_API_KEY (id:secret), GEMINI_API_KEY.
// Sem --publicar nada muda no site: revise o arquivo antes.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { ghostClient } from "./lib/ghost.mjs";
import { ilustrar } from "./lib/ilustrar.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const TIPO = args.tipo === "ilustracao" ? "ilustracao" : "charge";
const SAIDA = String(args.saida || "saida");
const PUBLICAR = args.publicar === true;
const CHARGE_VETORIAL = /\/charge-\d+\.(webp|png|jpe?g|svg)$/i;

function morre(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

async function lerPost(api, slug) {
  let p;
  try {
    p = await api.posts.read({ slug }, { formats: ["plaintext"] });
  } catch (e) {
    throw new Error(`post "${slug}": ${e.message}`, { cause: e });
  }
  if (!p?.id) throw new Error(`post "${slug}" não encontrado`);
  return p;
}

/** "Nome (cargo);Nome 2" → [{ nome, cargo }] */
function lerPersonagens(valor) {
  if (typeof valor !== "string" || !valor.trim()) return undefined;
  return valor
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.*?)\s*\((.*)\)\s*$/);
      return m ? { nome: m[1].trim(), cargo: m[2].trim() } : { nome: s };
    });
}

const MIME = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/** "Nome=arquivo.jpg,Nome 2=arquivo.png" → [{ nome, imagem, mime, credito }] */
async function lerReferencias(valor) {
  if (typeof valor !== "string" || !valor.trim()) return undefined;
  const refs = [];
  for (const par of valor.split(",")) {
    const [nome, arquivo] = par.split("=").map((s) => s.trim());
    if (!nome || !arquivo) throw new Error(`--referencias: use Nome=arquivo (recebi "${par}")`);
    refs.push({
      nome,
      imagem: await readFile(arquivo),
      mime: MIME[extname(arquivo).toLowerCase()] || "image/jpeg",
      credito: `arquivo local: ${arquivo}`,
      pagina: arquivo,
    });
  }
  return refs;
}

async function processa(api, post) {
  const imagemPronta = args.imagem ? await readFile(String(args.imagem)) : undefined;
  const r = await ilustrar({
    titulo: post.title,
    resumo: post.custom_excerpt || post.excerpt || "",
    texto: post.plaintext || "",
    tipo: TIPO,
    frase: typeof args.frase === "string" ? args.frase : undefined,
    imagemPronta,
    personagens: lerPersonagens(args.personagens),
    referencias: await lerReferencias(args.referencias),
    semPersonagens: args["sem-personagens"] === true,
  });

  await mkdir(SAIDA, { recursive: true });
  const arquivo = join(SAIDA, `${post.slug}.webp`);
  await writeFile(arquivo, r.webp);
  await writeFile(
    join(SAIDA, `${post.slug}.json`),
    JSON.stringify(
      {
        slug: post.slug,
        cena: r.cena,
        legenda: r.legenda,
        personagens: r.personagens,
        prompt: r.prompt,
        antes: post.feature_image,
      },
      null,
      2
    )
  );
  console.log(`  ✓ ${post.slug}`);
  console.log(`    legenda: ${r.legenda || "(sem)"}`);
  if (r.personagens?.length)
    console.log(
      `    personagens: ${r.personagens.map((p) => `${p.nome} (${p.credito})`).join("; ")}`
    );
  console.log(`    arquivo: ${arquivo}`);

  if (!PUBLICAR) return { slug: post.slug, arquivo, publicado: false };

  const enviado = await api.images.upload({ file: arquivo, purpose: "image" });
  if (!enviado?.url) throw new Error("upload não devolveu url");
  await api.posts.edit({
    id: post.id,
    feature_image: enviado.url,
    feature_image_alt: post.feature_image_alt || post.title,
    feature_image_caption:
      post.feature_image_caption || (TIPO === "charge" ? "Charge: HOJE MT" : "Ilustração: HOJE MT"),
    updated_at: post.updated_at,
  });
  console.log(`    publicado: ${enviado.url} (antes: ${post.feature_image || "sem imagem"})`);
  return { slug: post.slug, arquivo, publicado: true, url: enviado.url };
}

const api = ghostClient();
let alvos = [];

if (typeof args.slug === "string" && args.slug) {
  alvos = [await lerPost(api, args.slug).catch((e) => morre(e.message))];
} else if (args.curtas === true) {
  if (args.imagem) morre("--imagem serve para um post só (use --slug).");
  const lista = await api.posts
    .browse({
      filter: "tag:curtas",
      limit: "all",
      fields: "id,slug,title,feature_image,updated_at",
    })
    .catch((e) => morre(`listar a tag curtas: ${e.message}`));
  const comVetorial = lista.filter((p) => CHARGE_VETORIAL.test(p.feature_image || ""));
  console.log(`tag curtas: ${lista.length} post(s), ${comVetorial.length} com charge vetorial`);
  const limite = Number(args.limite || comVetorial.length);
  alvos = [];
  for (const p of comVetorial.slice(0, limite))
    alvos.push(await lerPost(api, p.slug).catch((e) => morre(e.message)));
} else {
  console.log("uso: ilustrar.mjs --slug=<slug> [--publicar] | --curtas [--publicar] [--limite=N]");
  console.log('     opções: --frase="..." --imagem=arte.png --tipo=charge|ilustracao --saida=dir');
  process.exit(process.argv.length > 2 ? 1 : 0);
}

console.log(
  `${PUBLICAR ? "PUBLICANDO" : "SÓ GERANDO (sem --publicar)"} · ${alvos.length} post(s) · tipo ${TIPO}`
);
let ok = 0,
  falhas = 0;
for (const post of alvos) {
  try {
    await processa(api, post);
    ok++;
  } catch (e) {
    falhas++;
    console.warn(`  ✗ ${post.slug} — ${e.message}`);
  }
}
console.log(`\nconcluído: ${ok} ok · ${falhas} falha(s)`);
process.exit(falhas && !ok ? 1 : 0);
