import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BotaoInstalar } from "./BotaoInstalar";

/**
 * O jsdom não dispara `beforeinstallprompt` — nenhum navegador dispara fora do
 * Chromium em origem segura. Aqui o evento é fabricado à mão, com o mesmo
 * formato que o Chrome entrega: um Event com `prompt()` e `userChoice`.
 */
function dispararConvite(escolha: "accepted" | "dismissed" = "accepted") {
  const evento = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(evento, { prompt, userChoice: Promise.resolve({ outcome: escolha }) });
  window.dispatchEvent(evento);
  return { evento, prompt };
}

describe("BotaoInstalar", () => {
  it("fica escondido enquanto o navegador não oferece a instalação", () => {
    render(<BotaoInstalar />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("aparece quando o convite chega e chama o prompt do navegador", async () => {
    render(<BotaoInstalar />);
    const { evento, prompt } = dispararConvite();

    // O preventDefault é o que impede o Chrome de mostrar a barra dele e
    // descartar o evento — sem isso o botão não teria o que disparar.
    expect(evento.defaultPrevented).toBe(true);

    const botao = await screen.findByRole("button", { name: /instalar app/i });
    await userEvent.click(botao);

    expect(prompt).toHaveBeenCalledOnce();
    // Instalado: a oferta some, e não volta com o mesmo evento.
    await waitFor(() => {
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  it("some também quando o app é instalado por fora, pelo menu do navegador", async () => {
    render(<BotaoInstalar />);
    dispararConvite();
    await screen.findByRole("button", { name: /instalar app/i });

    window.dispatchEvent(new Event("appinstalled"));

    await waitFor(() => {
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
