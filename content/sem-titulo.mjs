// Guarda contra posts vazios do publicador externo das Curtas.
// Sintoma: post publicado com título "(Untitled)", corpo vazio (lexical com parágrafos vazios),
// capa charge-dia-<timestamp>.webp e tags curtas+charges, sempre às 08:10/18:10 UTC
// (casos: untitled-2 em 19/09, untitled-3 em 28/09, untitled-4 em 01/10/2026).
//
// Uso:
//   node sem-titulo.mjs                 lista posts publicados sem título ou sem texto (não altera nada)
//   node sem-titulo.mjs --despublicar   tira do ar (status draft) os que estão SEM TÍTULO E SEM TEXTO
//                                       e registra em pautas/sem-titulo/registro.json
//   --dias=N                            janela de publicação a varrer (padrão 7); títulos "(Untitled)" são
//                                       procurados em todo o acervo, independentemente da janela
// Nunca apaga post; nunca mexe em post que tenha texto (só avisa).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ghostClient } from "./lib/ghost.mjs";

const args = process.argv.slice(2);
const despublicar = args.includes("--despublicar");
const dias = Number((args.find((a) => a.startsWith("--dias=")) || "--dias=7").split("=")[1]) || 7;
const aqui = path.dirname(fileURLToPath(import.meta.url));
const registroPath = path.join(aqui, "pautas", "sem-titulo", "registro.json");

const textoDe = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;| /g, " ")
    .replace(/\s+/g, "")
    .trim();
const semTitulo = (t) => !String(t || "").trim() || /^\(untitled\)$/i.test(String(t).trim());

const g = ghostClient();
const desde = new Date(Date.now() - dias * 86400e3).toISOString();
const opts = { limit: "all", formats: "html", include: "tags" };
const recentes = await g.posts.browse({ ...opts, filter: `status:published+published_at:>'${desde}'` });
const untitled = await g.posts.browse({ ...opts, filter: `status:published+title:'(Untitled)'` });
const vistos = new Map();
for (const p of [...recentes, ...untitled]) vistos.set(p.id, p);

const problemas = [];
for (const p of vistos.values()) {
  const st = semTitulo(p.title);
  const sx = textoDe(p.html).length === 0;
  if (st || sx) problemas.push({ p, semTitulo: st, semTexto: sx });
}
if (!problemas.length) {
  console.log(`ok: nenhum post publicado sem título ou sem texto (janela ${dias} dias + títulos "(Untitled)")`);
  process.exit(0);
}

let registro = [];
try { registro = JSON.parse(fs.readFileSync(registroPath, "utf8")); } catch {}
let mudou = false;
for (const { p, semTitulo: st, semTexto: sx } of problemas) {
  const capa = (p.feature_image || "").split("/").pop();
  const tags = (p.tags || []).map((t) => t.slug).join(",");
  const tipo = st && sx ? "SEM TÍTULO E SEM TEXTO" : st ? "sem título (tem texto)" : "sem texto (tem título)";
  console.log(`${tipo} · ${p.slug} · publicado ${p.published_at} · capa ${capa} · tags ${tags} · ${p.url}`);
  if (!(st && sx)) {
    console.log("   → não despublicado automaticamente: avise o editor (post tem conteúdo parcial).");
    continue;
  }
  if (!despublicar) { console.log("   → rode com --despublicar para tirar do ar"); continue; }
  const r = await g.posts.edit({ id: p.id, status: "draft", updated_at: p.updated_at });
  console.log(`   → tirado do ar (status ${r.status})`);
  registro.unshift({
    data: new Date().toISOString(),
    id: p.id,
    slug: p.slug,
    titulo: p.title,
    publicado_em: p.published_at,
    status_agora: r.status,
    feature_image: p.feature_image,
    motivo: `Post publicado sem título e sem texto (falha do publicador externo das Curtas; capa ${capa}). Tirado do ar automaticamente por sem-titulo.mjs; sem fato, não há charge a fazer.`,
  });
  mudou = true;
}
if (mudou) {
  fs.mkdirSync(path.dirname(registroPath), { recursive: true });
  fs.writeFileSync(registroPath, JSON.stringify(registro, null, 2) + "\n");
  console.log(`registro atualizado: ${path.relative(process.cwd(), registroPath)}`);
}
