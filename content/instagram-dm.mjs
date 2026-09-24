#!/usr/bin/env node
// =============================================================
// instagram-dm.mjs — interação com leitores pelo Direct do Instagram
// (Graph API / Instagram Messaging), dentro do que a Meta permite.
// =============================================================
//
// O que faz (tudo em resposta a quem procurou o HOJE MT primeiro):
//   --responder-comentarios  quem comenta num post pedindo a matéria ("link",
//                            "manda", "quero", "fonte", "onde leio"…) recebe
//                            no Direct uma "private reply" com o link da
//                            matéria, e uma resposta pública curta no post.
//                            Com --todos, todo comentário novo recebe o link.
//   --responder-directs      conversas em que a ÚLTIMA mensagem é do leitor
//                            (janela de 24 h da Meta) recebem: link da matéria
//                            que ele pediu (procura o tema nas manchetes do
//                            RSS) ou as 3 últimas manchetes com link.
//   --janela=20              só olha comentários/mensagens dos últimos N min
//                            (cron a cada 15 min → 20 dá margem; sem estado)
//   --dry-run                mostra o que enviaria, não envia
//
// O que NÃO faz, por regra da Meta e por política editorial: não inicia
// conversa com quem nunca falou com a conta, não envia mensagem em massa,
// não raspa lista de seguidores de ninguém. A API nem permite: fora da janela
// de 24 h e sem mensagem prévia do usuário, o envio é recusado (erro 10/2018).
//
// Env: IG_USER_ID, IG_ACCESS_TOKEN (token de longa duração com
//      instagram_basic, instagram_manage_comments, instagram_manage_messages),
//      IG_USERNAME (default hoje.mt), GRAPH_API_URL (default graph.facebook.com/v21.0),
//      SITE_URL (default https://hojemt.com.br), IG_LINKS_JSON (mapa opcional
//      permalink→url da matéria, default content/pautas/instagram-links.json).
import { readFile } from "node:fs/promises";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const GRAPH = (process.env.GRAPH_API_URL || "https://graph.facebook.com/v21.0").replace(/\/+$/, "");
const IG_ID = process.env.IG_USER_ID;
const TOKEN = process.env.IG_ACCESS_TOKEN;
const EU = (process.env.IG_USERNAME || "hoje.mt").toLowerCase();
const SITE = (process.env.SITE_URL || "https://hojemt.com.br").replace(/\/+$/, "");
const JANELA_MIN = Number(args.janela || 20);
const DRY = args["dry-run"] === true;
const GATILHOS =
  /\b(link|manda|me envia|envia|quero|fonte|onde (leio|vejo|acho)|mat[ée]ria completa|como leio|cad[êe] o link)\b/i;

if (!args["responder-comentarios"] && !args["responder-directs"]) {
  console.log(
    "uso: instagram-dm.mjs --responder-comentarios [--todos] --responder-directs [--janela=20] [--dry-run]"
  );
  process.exit(1);
}
if (!IG_ID || !TOKEN) {
  console.error(
    "ERRO: defina IG_USER_ID e IG_ACCESS_TOKEN (Meta for Developers → app → Instagram → tokens)."
  );
  process.exit(1);
}

async function graph(caminho, { method = "GET", body } = {}) {
  const url = new URL(`${GRAPH}/${caminho}`);
  url.searchParams.set("access_token", TOKEN);
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      `${method} ${caminho}: ${j.error?.message || r.status} (code ${j.error?.code ?? "?"})`
    );
  return j;
}

const recente = (iso) => Date.now() - new Date(iso).getTime() <= JANELA_MIN * 60 * 1000;
const semAcento = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Últimas manchetes do site (RSS), para responder no Direct. */
async function manchetes(n = 12) {
  try {
    const xml = await (await fetch(`${SITE}/rss/`)).text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, n)
      .map(([, it]) => ({
        titulo:
          (it.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s) || [])[1]?.trim() || "",
        link: (it.match(/<link>(.*?)<\/link>/s) || [])[1]?.trim() || SITE,
      }))
      .filter((m) => m.titulo);
  } catch {
    return [];
  }
}

/** Link da matéria para um post: mapa JSON → URL na legenda → manchete parecida → site. */
async function linkDoPost(media, lista) {
  try {
    const mapa = JSON.parse(
      await readFile(process.env.IG_LINKS_JSON || "content/pautas/instagram-links.json", "utf8")
    );
    if (mapa[media.permalink]) return mapa[media.permalink];
    if (mapa[media.id]) return mapa[media.id];
  } catch {
    /* sem mapa */
  }
  const naLegenda = (media.caption || "").match(/https?:\/\/hojemt\.com\.br\/[^\s)]+/i);
  if (naLegenda) return naLegenda[0];
  const primeira = semAcento((media.caption || "").split("\n")[0]);
  const parecida = lista.find((m) => {
    const t = semAcento(m.titulo);
    const palavras = t.split(/\W+/).filter((p) => p.length > 4);
    return (
      palavras.length &&
      palavras.filter((p) => primeira.includes(p)).length >= Math.min(2, palavras.length)
    );
  });
  return parecida?.link || SITE;
}

async function enviar(recipient, text) {
  if (DRY) return console.log(`  [dry-run] → ${JSON.stringify(recipient)}: ${text.slice(0, 90)}…`);
  await graph(`${IG_ID}/messages`, { method: "POST", body: { recipient, message: { text } } });
}

async function responderComentarios(lista) {
  const { data: medias = [] } = await graph(
    `${IG_ID}/media?fields=id,permalink,caption,timestamp,comments.limit(50){id,text,username,timestamp}&limit=12`
  );
  let enviados = 0;
  for (const media of medias) {
    const comentarios = (media.comments?.data || []).filter(
      (c) =>
        recente(c.timestamp) &&
        c.username?.toLowerCase() !== EU &&
        (args.todos === true || GATILHOS.test(c.text || ""))
    );
    if (!comentarios.length) continue;
    const link = await linkDoPost(media, lista);
    for (const c of comentarios) {
      console.log(
        `comentário de @${c.username} em ${media.permalink}: "${(c.text || "").slice(0, 60)}"`
      );
      try {
        await enviar(
          { comment_id: c.id },
          `Oi, @${c.username}! Aqui está a matéria completa do HOJE MT: ${link}\n\nObrigado por acompanhar. Se tiver uma pauta ou denúncia, é só responder aqui.`
        );
        if (!DRY)
          await graph(
            `${c.id}/replies?message=${encodeURIComponent("Te enviamos o link no Direct 📩")}`,
            { method: "POST" }
          );
        enviados++;
      } catch (e) {
        // já respondido (uma private reply por comentário) ou fora dos 7 dias: segue
        console.warn(`  não enviado: ${e.message}`);
      }
    }
  }
  console.log(`comentários respondidos: ${enviados}`);
}

async function responderDirects(lista) {
  const { data: conversas = [] } = await graph(
    `${IG_ID}/conversations?platform=instagram&fields=id,updated_time,participants,messages.limit(5){id,created_time,from,message}`
  );
  let enviados = 0;
  for (const conversa of conversas) {
    if (!recente(conversa.updated_time)) continue;
    const msgs = conversa.messages?.data || [];
    const ultima = msgs[0];
    if (!ultima || !ultima.from) continue;
    const doLeitor = ultima.from.id !== IG_ID && (ultima.from.username || "").toLowerCase() !== EU;
    if (!doLeitor || !recente(ultima.created_time)) continue;
    const texto = semAcento(ultima.message);
    const pedida = lista.find((m) => {
      const palavras = semAcento(m.titulo)
        .split(/\W+/)
        .filter((p) => p.length > 4);
      return palavras.filter((p) => texto.includes(p)).length >= 2;
    });
    const resposta = pedida
      ? `Oi! Achei o que você procura no HOJE MT: ${pedida.titulo} — ${pedida.link}\n\nQuer outra matéria? É só me dizer o tema.`
      : `Oi! Aqui é o HOJE MT. Obrigado pela mensagem.\n\nÚltimas do site:\n${lista
          .slice(0, 3)
          .map((m) => `• ${m.titulo} — ${m.link}`)
          .join(
            "\n"
          )}\n\nSe quiser uma matéria específica, me diga o tema. Pautas e denúncias também são bem-vindas por aqui.`;
    console.log(
      `direct de @${ultima.from.username || ultima.from.id}: "${(ultima.message || "").slice(0, 60)}"`
    );
    try {
      await enviar({ id: ultima.from.id }, resposta);
      enviados++;
    } catch (e) {
      console.warn(`  não enviado: ${e.message}`);
    }
  }
  console.log(`directs respondidos: ${enviados}`);
}

const lista = await manchetes();
if (args["responder-comentarios"]) await responderComentarios(lista);
if (args["responder-directs"]) await responderDirects(lista);
