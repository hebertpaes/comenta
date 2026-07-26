import type { User, UserRole } from "@comenta/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { users } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";

const inputStyle = { padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" } as const;

export function UsersPage() {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("agent");
  const [validation, setValidation] = useState("");

  const query = useQuery({ queryKey: keys.users, queryFn: users.list });
  const reload = () => queryClient.invalidateQueries({ queryKey: keys.users });

  const create = useMutation({
    mutationFn: () => users.create({ name: name.trim(), email: email.trim(), password, role }),
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
      setRole("agent");
      void reload();
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ user, next }: { user: User; next: UserRole }) =>
      users.update(user.id, { role: next }),
    onSuccess: reload,
  });

  const remove = useMutation({
    mutationFn: (user: User) => users.remove(user.id),
    onSuccess: reload,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setValidation("Preencha nome, e-mail e senha.");
      return;
    }
    setValidation("");
    create.mutate();
  };

  const mutationError = create.error ?? changeRole.error ?? remove.error;

  return (
    <>
      <h2>Usuários</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Atendentes e administradores da empresa.
      </p>

      <form
        onSubmit={submit}
        className="card"
        style={{
          padding: 14,
          marginBottom: 16,
          flexDirection: "row",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          aria-label="Nome"
          style={{ ...inputStyle, flex: "1 1 140px" }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          type="email"
          aria-label="E-mail"
          style={{ ...inputStyle, flex: "1 1 160px" }}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          type="password"
          autoComplete="new-password"
          aria-label="Senha"
          style={{ ...inputStyle, flex: "1 1 120px" }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          aria-label="Perfil"
          style={inputStyle}
        >
          <option value="agent">Atendente</option>
          <option value="admin">Administrador</option>
        </select>
        <button disabled={create.isPending}>{create.isPending ? "…" : "➕ Criar"}</button>
      </form>

      {validation && (
        <div className="err" role="alert">
          {validation}
        </div>
      )}
      {mutationError && <ErrorBox error={mutationError} />}

      <Async {...query} onRetry={() => void query.refetch()}>
        {({ data: list }) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {list.map((u) => (
              <div
                key={u.id}
                className="card"
                style={{
                  padding: 12,
                  flexDirection: "row",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {u.email}
                  </div>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => changeRole.mutate({ user: u, next: e.target.value as UserRole })}
                  aria-label={`Perfil de ${u.name}`}
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: 13 }}
                >
                  <option value="agent">Atendente</option>
                  <option value="admin">Administrador</option>
                </select>
                <button
                  className="link"
                  style={{ color: "#dc2626" }}
                  onClick={() => {
                    if (confirm(`Remover o usuário ${u.name}?`)) remove.mutate(u);
                  }}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </Async>
    </>
  );
}
