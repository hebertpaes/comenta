/*
 * Service worker do painel instalado.
 *
 * Existe por dois motivos:
 *
 * 1. O Chrome só oferece "Instalar" (e só deixa o app abrir em janela própria
 *    no Dock) quando o site tem manifesto E um service worker com handler de
 *    `fetch`. Sem este arquivo, o manifesto sozinho não instala nada.
 * 2. Abrir o app sem rede mostra a casca do painel com um aviso, em vez do
 *    dinossauro do Chrome dentro da janela do app — que é o pior lugar
 *    possível para ele aparecer, porque não há barra de endereços para
 *    recarregar.
 *
 * O que ele NÃO faz: cachear dados. Toda chamada à API sai de outra origem
 * (api.comenta.com.br, ou :4000 no Mac) e nem passa por aqui. Conversa antiga
 * servida do cache seria pior que erro de rede.
 */

// Suba a versão ao mudar este arquivo: o `activate` apaga todo cache com nome
// diferente, e é isso que impede o painel novo de rodar com asset velho.
const VERSAO = "comenta-v1";
const CASCA = "/index.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.add(new Request(CASCA, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      // Assume as abas já abertas em vez de esperar todas fecharem.
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Outra origem = API, mídia do WhatsApp, fontes. Passa direto.
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir o app, F5, link direto): rede primeiro, para nunca servir
  // um index.html velho apontando para bundle que já saiu do ar. Só quando a
  // rede falha é que entra a casca guardada.
  if (req.mode === "navigate") {
    evento.respondWith(
      fetch(req)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(CASCA, copia));
          return resposta;
        })
        .catch(() => caches.match(CASCA).then((casca) => casca ?? Response.error()))
    );
    return;
  }

  // Assets do build levam hash no nome (/assets/index-a1b2c3.js): o conteúdo
  // nunca muda para uma mesma URL, então cache primeiro é seguro e deixa a
  // abertura do app instantânea.
  if (url.pathname.startsWith("/assets/")) {
    evento.respondWith(
      caches.match(req).then(
        (guardado) =>
          guardado ??
          fetch(req).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(VERSAO).then((cache) => cache.put(req, copia));
            }
            return resposta;
          })
      )
    );
  }
});
