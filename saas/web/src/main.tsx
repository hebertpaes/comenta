import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router";
import { AuthProvider } from "./auth/AuthContext";
import { routes } from "./app/routes";
import { createQueryClient } from "./lib/queryClient";
import "./styles.css";

const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado no index.html");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* O AuthProvider usa o QueryClient para carregar o /auth/me, então
          precisa ficar por dentro dele; e o router por dentro do auth, porque
          os guardas de rota consultam a sessão. */}
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
