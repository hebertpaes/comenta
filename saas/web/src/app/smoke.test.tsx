import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { createQueryClient } from "../lib/queryClient";
import { routes } from "./routes";

/**
 * Monta a aplicação de verdade, com o mesmo encadeamento de providers do
 * main.tsx. Existe para pegar erro de runtime que o typecheck não vê — o tipo
 * de falha que resulta em tela branca, com o HTML e os assets servindo 200.
 */
describe("montagem da aplicação", () => {
  it("renderiza a tela de login sem estourar", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/entrar"] });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Plataforma de atendimento multicanal")).toBeInTheDocument();
    });
  });

  it("manda para o login quem entra na raiz sem sessão", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/"] });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/entrar");
    });
  });
});
