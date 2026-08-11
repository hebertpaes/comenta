import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/useAuth";
import { Loading } from "../components/Async";

/** Exige sessão. Guarda de onde o usuário veio para devolvê-lo ali depois do
 *  login, em vez de largá-lo sempre no dashboard. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/entrar" replace state={{ from: location }} />;
  if (isLoading) return <Loading />;
  if (mustChangePassword) return <Navigate to="/trocar-senha" replace />;

  return <>{children}</>;
}

/** Só administradores. A API já recusa com 403 em requireAdmin; isto só evita
 *  mostrar uma tela que o usuário não conseguiria usar. */
export function RequireAdmin() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
