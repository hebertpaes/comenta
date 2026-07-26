import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./http";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // O painel fica aberto o dia inteiro numa aba; revalidar ao voltar o
        // foco é o que mantém a lista de conversas próxima do real sem
        // precisar de polling em toda tela.
        refetchOnWindowFocus: true,
        staleTime: 15_000,
        retry: (failureCount, error) => {
          // Não adianta repetir o que o servidor já recusou por permissão,
          // ausência ou dado inválido — só 5xx e falha de rede merecem retry.
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
