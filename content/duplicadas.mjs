#!/usr/bin/env node
// =============================================================
// duplicadas.mjs — acha notícias publicadas duas vezes no Ghost e despublica
// a cópia (volta para rascunho; nada é apagado).
//
// O publicador automático (fora deste repositório) às vezes processa a mesma
// matéria da fonte duas vezes e publica com títulos diferentes ("Ancelotti
// conduz 1º treino completo..." e "Ancelotti lidera primeiro treino..."). O
// slug e o nome da imagem mudam, então a comparação é pelo conteúdo: texto,
// foto de destaque (dHash) e link da fonte na legenda da foto.
//
//   node duplicadas.mjs                      candidatos dos últimos 3 dias
//   node duplicadas.mjs --dias=30 --json=x   todos os candidatos, em JSON
//   node duplicadas.mjs --despublicar=copia:mantido[,copia2:mantido2]
//
// Os candidatos NÃO são despublicados sozinhos: agenda do dia, sorteios
// diferentes da Mega-Sena, estados diferentes e matérias de continuação se
// parecem com duplicata. Leia o começo dos dois textos antes de decidir.
// Regra: mantém a versão mais antiga (URL que pode ter circulado), a não ser
// que ela esteja sem foto ou com erro; numa cobertura ao vivo, a atualização.
// Cada despublicação vai para pautas/duplicadas/registro.json.
//
// Env: GHOST_ADMIN_URL, GHOST_ADMIN_API_KEY (id:secret).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import { ghostClient } from "./lib/ghost.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const api = ghostClient();
const REGISTRO = new URL("./pautas/duplicadas/registro.json", import.meta.url);

// ---------- despublicar ----------
if (args.despublicar) {
  const pares = String(args.despublicar).split(",").map((p) => p.split(":"));
  mkdirSync(new URL("./pautas/duplicadas/", import.meta.url), { recursive: true });
  const reg = existsSync(REGISTRO) ? JSON.parse(readFileSync(REGISTRO, "utf8")) : [];
  for (const [copia, mantido] of pares) {
    if (!copia || !mantido) throw new Error(`par inválido: ${copia}:${mantido}`);
    const k = await api.posts.read({ slug: mantido });
    if (k.status !== "published") throw new Error(`o mantido não está publicado: ${mantido}`);
    const p = await api.posts.read({ slug: copia });
    if (p.status !== "published") { console.log(`já fora do ar: ${copia} (${p.status})`); continue; }
    const ed = await api.posts.edit({ id: p.id, updated_at: p.updated_at, status: "draft" });
    reg.push({ data: new Date().toISOString(), id: p.id, slug: copia, titulo: p.title, publicado_em: p.published_at, status_agora: ed.status, mantido, mantido_titulo: k.title });
    console.log(`${ed.status}: ${copia} → mantido ${mantido}`);
  }
  writeFileSync(REGISTRO, JSON.stringify(reg, null, 1) + "\n");
  process.exit(0);
}

// ---------- detectar ----------
const DIAS = Number(args.dias || 3);
const desde = new Date(Date.now() - DIAS * 86400e3).toISOString().slice(0, 19).replace("T", " ");
const posts = [];
for (let page = 1; ; page++) {
  const r = await api.posts.browse({
    filter: `status:published+published_at:>'${desde}'`, limit: 100, page, order: "published_at asc",
    fields: "id,title,slug,published_at,feature_image,feature_image_caption", formats: "plaintext",
  });
  posts.push(...r);
  if (!r.meta?.pagination?.next) break;
}

const STOP = new Set("a o as os de da do das dos e em no na nos nas um uma para por com que se ao aos sua seu suas seus mais como foi sao ser esta este essa esse nesta neste apos entre sobre pela pelo pelas pelos ja ate tambem nao ou quando onde".split(" "));
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ");
const tokens = (s) => new Set(norm(s).split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / Math.max(1, a.size + b.size - i); };
// imagens genéricas do publicador (charge automática, capa verde, fallback) não contam como "mesma foto"
const GENERICA = /\/(charge|charge-dia|hmt|capa-[^/]*|opiniao-[^/]*)(-\d+)?\.(webp|jpe?g|png)$/;

async function dhash(url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const px = await sharp(Buffer.from(await r.arrayBuffer())).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let h = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
  return h;
}
const hamming = (a, b) => { let x = a ^ b, n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; };

for (const p of posts) {
  p.t = Date.parse(p.published_at);
  p.tk = tokens(`${p.title} ${(p.plaintext || "").slice(0, 500)}`);
  p.titulo = norm(p.title).replace(/\s+/g, " ").trim();
  p.fonte = (p.feature_image_caption || "").match(/href="([^"]+)"/)?.[1] || null;
  p.dh = p.feature_image && !GENERICA.test(p.feature_image) ? await dhash(p.feature_image).catch(() => null) : null;
}

const candidatos = [];
for (let i = 0; i < posts.length; i++) {
  for (let j = i + 1; j < posts.length; j++) {
    const a = posts[i], b = posts[j];
    if (b.t - a.t > 48 * 3600e3) break;
    if (a.title === "(Untitled)" || b.title === "(Untitled)") continue;
    const tx = jaccard(a.tk, b.tk);
    const mesmoTitulo = a.titulo === b.titulo;
    const mesmaFoto = a.dh != null && b.dh != null && hamming(a.dh, b.dh) <= 6;
    const mesmaFonte = a.fonte && b.fonte && a.fonte.replace(/[^a-z0-9]/gi, "").slice(-40) === b.fonte.replace(/[^a-z0-9]/gi, "").slice(-40);
    if (mesmoTitulo || tx >= 0.45 || (mesmaFoto && tx >= 0.18) || (mesmaFonte && tx >= 0.15)) {
      candidatos.push({
        texto: +tx.toFixed(2), mesmoTitulo, mesmaFoto, mesmaFonte: !!mesmaFonte,
        a: { slug: a.slug, titulo: a.title, publicado_em: a.published_at, sem_foto: !a.feature_image, inicio: (a.plaintext || "").slice(0, 280) },
        b: { slug: b.slug, titulo: b.title, publicado_em: b.published_at, sem_foto: !b.feature_image, inicio: (b.plaintext || "").slice(0, 280) },
      });
    }
  }
}

if (args.json) writeFileSync(String(args.json), JSON.stringify(candidatos, null, 1));
console.log(`${posts.length} publicados nos últimos ${DIAS} dias · ${candidatos.length} pares candidatos`);
for (const c of candidatos) {
  console.log(`\n[texto ${c.texto}${c.mesmoTitulo ? " · título igual" : ""}${c.mesmaFoto ? " · mesma foto" : ""}${c.mesmaFonte ? " · mesma fonte" : ""}]`);
  for (const x of [c.a, c.b]) console.log(`  ${x.publicado_em.slice(0, 16)} ${x.slug}${x.sem_foto ? " (sem foto)" : ""}\n    ${x.titulo}\n    ${x.inicio.replace(/\s+/g, " ").slice(0, 200)}`);
}
