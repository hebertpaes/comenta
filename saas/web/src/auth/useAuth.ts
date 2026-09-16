import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthValue } from "./AuthContext";

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
