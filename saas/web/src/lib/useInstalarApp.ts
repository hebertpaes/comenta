import { useCallback, useEffect, useState } from "react";

/**
 * Evento que o Chrome dispara quando o painel passa nos critérios de
 * instalação (manifesto + service worker + origem segura). Não está nas libs do
 * TypeScript porque só existe nos navegadores Chromium.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Já está rodando como app (janela própria), e não numa aba do navegador. */
function jaEhApp(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // Caminho do iOS: o Safari não implementa display-mode, marca isto.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Instalação do painel como app de verdade — janela sem barra de endereços,
 * ícone no Dock/menu Iniciar, igual ao Chrome Remote Desktop.
 *
 * `podeInstalar` só fica verdadeiro no Chrome/Edge, em origem segura
 * (https ou localhost) e enquanto o app não estiver instalado. No Safari e no
 * Firefox o evento nunca chega e o botão simplesmente não aparece — lá a
 * instalação é manual, pelo menu do navegador.
 */
export function useInstalarApp() {
  const [pedido, setPedido] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(jaEhApp);

  useEffect(() => {
    function aoPoderInstalar(evento: Event) {
      // Sem o preventDefault o Chrome mostra a barrinha dele e descarta o
      // evento — o botão do painel ficaria sem nada para disparar.
      evento.preventDefault();
      setPedido(evento as BeforeInstallPromptEvent);
    }
    function aoInstalar() {
      setPedido(null);
      setInstalado(true);
    }

    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!pedido) return;
    await pedido.prompt();
    const { outcome } = await pedido.userChoice;
    // O evento é de uso único: aceito ou recusado, ele não serve mais. Se o
    // usuário recusar, o Chrome dispara outro numa visita seguinte.
    setPedido(null);
    if (outcome === "accepted") setInstalado(true);
  }, [pedido]);

  return { podeInstalar: pedido !== null && !instalado, instalado, instalar };
}
