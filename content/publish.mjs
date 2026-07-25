// =============================================================
// publish.mjs — robô de conteúdo do blog (Ghost)
// Curadoria de fontes REAIS → resumo com IA (com crédito) → Ghost.
//
// SEGURANÇA: nunca inventa fatos. Cada post é resumido a partir de uma
// matéria real e sempre linka/credita a fonte. Publica como RASCUNHO por
// padrão (revisão humana); só auto-publica se BLOG_AUTOPUBLISH=1.
//
// Env:
//   GHOST_ADMIN_URL       (default http://localhost:2368)
//   GHOST_ADMIN_API_KEY   (Ghost → Integrations → Custom → Admin API Key)
//   ANTHROPIC_API_KEY     (opcional — liga o resumo por IA; sem ela, usa o trecho da fonte)
//   BLOG_AUTOPUBLISH=1    (opcional — publica direto; padrão = rascunho)
//   BLOG_PER_FEED         (opcional — nº de itens por feed, default 3)
//   BLOG_INTERVAL_MIN     (opcional — se setado, roda em loop a cada N min)
// =============================================================
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import Parser from "rss-parser";
import { ghostClient, postExists, createPost } from "./lib/ghost.mjs";
import { summarize } from "./lib/summarize.mjs";

const parser = new Parser({ timeout: 15000 });
const PER_FEED = Number(process.env.BLOG_PER_FEED || 3);

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// slug estável por fonte → dedupe idempotente
const sourceSlug = (url, title) =>
  `cur-${slugify(title).slice(0, 40)}-${crypto.createHash("sha1").update(url).digest("hex").slice(0, 8)}`;

function pickImage(item) {
  return (
    item.enclosure?.url ||
    item["media:content"]?.$?.url ||
    (item.content && (item.content.match(/<img[^>]+src="([^"]+)"/) || [])[1]) ||
    undefined
  );
}

async function runOnce() {
  const cfg = JSON.parse(await readFile(new URL("./feeds.json", import.meta.url)));
  const api = ghostClient();
  let created = 0,
    skipped = 0,
    failed = 0;

  for (const cat of cfg.categorias) {
    for (const feedUrl of cat.feeds) {
      let feed;
      try {
        feed = await parser.parseURL(feedUrl);
      } catch (e) {
        console.warn(`  feed falhou: ${feedUrl} (${e.message})`);
        failed++;
        continue;
      }
      const source = feed.title || new URL(feedUrl).hostname;

      for (const item of (feed.items || []).slice(0, PER_FEED)) {
        const link = item.link;
        const title = (item.title || "").trim();
        if (!link || !title) continue;
        const slug = sourceSlug(link, title);

        if (await postExists(api, slug)) {
          skipped++;
          continue;
        }

        const snippet = (item.contentSnippet || item.summary || "").trim().slice(0, 1200);
        try {
          const art = await summarize({ title, snippet, link, source, category: cat.tag });
          await createPost(api, {
            title,
            slug,
            html: art.html,
            excerpt: art.excerpt,
            tags: [cat.tag, "curadoria-automatica"],
            featureImage: pickImage(item),
          });
          created++;
          console.log(`  ✓ [${cat.tag}] ${title.slice(0, 70)}`);
        } catch (e) {
          failed++;
          console.warn(`  ✗ ${title.slice(0, 60)} — ${e.message}`);
        }
      }
    }
  }
  const modo = process.env.BLOG_AUTOPUBLISH === "1" ? "PUBLICADO" : "RASCUNHO";
  console.log(`\n[${modo}] criados ${created} · pulados(existentes) ${skipped} · falhas ${failed}`);
}

const intervalMin = Number(process.env.BLOG_INTERVAL_MIN || 0);
if (intervalMin > 0 && !process.argv.includes("--once")) {
  const loop = async () => {
    try {
      await runOnce();
    } catch (e) {
      console.error("erro:", e.message);
    }
    console.log(`próxima rodada em ${intervalMin} min…`);
  };
  await loop();
  setInterval(loop, intervalMin * 60_000);
} else {
  await runOnce().catch((e) => {
    console.error("erro:", e.message);
    process.exit(1);
  });
}
