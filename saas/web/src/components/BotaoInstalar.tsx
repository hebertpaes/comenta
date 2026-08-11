import { useInstalarApp } from "../lib/useInstalarApp";

/**
 * Aparece na barra lateral só quando dá para instalar — some depois de
 * instalado e nunca chega a existir em navegador que não suporta.
 */
export function BotaoInstalar() {
  const { podeInstalar, instalar } = useInstalarApp();

  if (!podeInstalar) return null;

  return (
    <button className="themebtn instalarbtn" onClick={() => void instalar()}>
      ⬇️ Instalar app
    </button>
  );
}
