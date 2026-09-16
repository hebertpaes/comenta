import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { auth } from "../../api/endpoints";
import { useAuth } from "../../auth/useAuth";
import { Logo } from "../../components/Logo";

/** Troca obrigatória de senha (contas semeadas / senha provisória). */
export function ChangePasswordPage() {
  const { isAuthenticated, mustChangePassword, refresh, logout } = useAuth();
  const navigate = useNavigate();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) return <Navigate to="/entrar" replace />;
  // Chegou aqui sem precisar trocar (link direto): não há o que fazer.
  if (!mustChangePassword) return <Navigate to="/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 8) {
      setError("A nova senha precisa ter ao menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      await auth.changePassword(current, next);
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível trocar a senha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="login" onSubmit={submit}>
      <Logo />
      <p className="muted">Por segurança, troque a senha provisória antes de continuar.</p>

      <div className="field">
        <label htmlFor="current">Senha atual</label>
        <input
          id="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="next">Nova senha</label>
        <input
          id="next"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirmar nova senha</label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}

      <button style={{ width: "100%", marginTop: 8 }} disabled={busy}>
        {busy ? "…" : "Trocar senha e entrar"}
      </button>

      <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
        <button
          type="button"
          className="link"
          onClick={() => {
            logout();
            navigate("/entrar", { replace: true });
          }}
        >
          Sair
        </button>
      </p>
    </form>
  );
}
