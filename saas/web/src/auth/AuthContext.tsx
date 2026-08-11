import type { MeResponse } from "@comenta/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { auth } from "../api/endpoints";
import { keys } from "../api/keys";
import { isLoggedIn, subscribeToTokens } from "../lib/tokens";

export interface AuthValue {
  /** null enquanto carrega ou quando não há sessão. */
  me: MeResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  mustChangePassword: boolean;
  refresh: () => Promise<unknown>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components -- o contexto e o provider andam juntos; separá-los só para agradar o fast refresh não ajuda ninguém.
export const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(isLoggedIn);

  // O cliente HTTP limpa os tokens sozinho quando o refresh falha. Sem ouvir
  // isso, o painel continuaria mostrando a interface logada até a próxima
  // navegação, com todas as requisições falhando em silêncio.
  useEffect(() => subscribeToTokens(() => setHasToken(isLoggedIn())), []);

  const meQuery = useQuery({
    queryKey: keys.me,
    queryFn: auth.me,
    enabled: hasToken,
    staleTime: 60_000,
  });

  const logout = useCallback(() => {
    auth.logout();
    setHasToken(false);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthValue>(() => {
    const me = hasToken ? (meQuery.data ?? null) : null;
    return {
      me,
      isAuthenticated: hasToken,
      isLoading: hasToken && meQuery.isPending,
      isAdmin: me?.principal.role === "admin",
      mustChangePassword: me?.mustChangePassword ?? false,
      refresh: () => queryClient.invalidateQueries({ queryKey: keys.me }),
      logout,
    };
  }, [hasToken, meQuery.data, meQuery.isPending, queryClient, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
