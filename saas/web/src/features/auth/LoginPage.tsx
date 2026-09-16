import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { auth } from "../../api/endpoints";
import { useAuth } from "../../auth/useAuth";
import { Logo } from "../../components/Logo";

type Mode = "login" | "signup";

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { isAuthenticated, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>("login");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Já logado e caiu no /entrar (link antigo, back do navegador): manda pra dentro.
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await auth.login(email, password);
      else await auth.signup(companyName, name, email, password);
      await refresh();
      const from = (location.state as LocationState | null)?.from?.pathname;
      navigate(from ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="login" onSubmit={submit}>
      <Logo />
      <p className="muted">Plataforma de atendimento multicanal</p>

      {mode === "signup" && (
        <>
          <div className="field">
            <label htmlFor="companyName">Empresa</label>
            <input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="name">Seu nome</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}

      <button style={{ width: "100%", marginTop: 8 }} disabled={busy}>
        {busy ? "…" : mode === "login" ? "Entrar" : "Criar conta"}
      </button>

      <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
        {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "Criar empresa" : "Entrar"}
        </button>
      </p>
    </form>
  );
}
