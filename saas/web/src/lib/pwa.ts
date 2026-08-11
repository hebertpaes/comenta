/**
 * Liga o service worker de public/sw.js — é ele que faz o Chrome oferecer
 * "Instalar app" e o painel abrir em janela própria.
 *
 * Só em produção. No `vite dev` o service worker atrapalha: ele responde do
 * cache enquanto o HMR troca o módulo, e edições param de aparecer sem motivo
 * visível. Por isso o ramo de desenvolvimento faz o contrário — remove
 * qualquer registro que tenha sobrado de um `npm run preview` na mesma porta.
 */
export function registrarServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((registros) => {
      for (const registro of registros) void registro.unregister();
    });
    return;
  }

  // Depois do `load`: registrar durante o carregamento inicial faz a busca do
  // sw.js competir com o bundle e o CSS da primeira tela.
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((erro) => {
      // Falhar aqui não quebra o painel — só perde a instalação e o offline.
      console.warn("Service worker não registrou:", erro);
    });
  });
}
