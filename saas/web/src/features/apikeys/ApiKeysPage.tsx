import type { ApiKeyCreated } from "@comenta/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { apiKeys } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";
import { SecretOnce } from "../../components/SecretOnce";
import { BASE } from "../../lib/http";

/**
 * Chaves de API (só admin).
 *
 * As rotas `/api-keys` existem desde o começo e nunca tiveram tela: para
 * integrar um sistema externo era preciso criar a chave por curl. A chave em
 * claro só volta na resposta de criação — daí o `SecretOnce`.
 *
 * Revogar não apaga a linha: a API grava `revokedAt`, então a chave continua
 * listada, marcada como revogada. É de propósito, serve de trilha de auditoria.
 */
export function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);

  const query = useQuery({ queryKey: keys.apiKeys, queryFn: apiKeys.list });
  const reload = () => queryClient.invalidateQueries({ queryKey: keys.apiKeys });

  const create = useMutation({
    mutationFn: (n: string) => apiKeys.create(n),
    onSuccess: (row) => {
      setName("");
      setCreated(row);
      void reload();
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => apiKeys.revoke(id),
    onSuccess: reload,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) create.mutate(trimmed);
  };

  return (
    <>
      <h2>Chaves de API</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Para sistemas externos falarem com a API sem uma sessão de usuário. Mande a chave no
        cabeçalho <code>Authorization: Bearer …</code> contra <code>{BASE}</code>.
      </p>

      {created && (
        <SecretOnce
          label={`Chave "${created.name}" criada`}
          value={created.key}
          onDismiss={() => setCreated(null)}
        />
      )}

      <form
        onSubmit={submit}
        className="card"
        style={{
          padding: 16,
          marginBottom: 18,
          maxWidth: 520,
          flexDirection: "row",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da chave (ex.: ERP, site institucional)"
          aria-label="Nome da chave"
          maxLength={64}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }}
        />
        <button disabled={create.isPending}>{create.isPending ? "…" : "➕ Criar"}</button>
      </form>

      {(create.error ?? revoke.error) && <ErrorBox error={create.error ?? revoke.error} />}

      <Async {...query} onRetry={() => void query.refetch()}>
        {({ data: list }) =>
          list.length === 0 ? (
            <p className="muted">Nenhuma chave criada ainda.</p>
          ) : (
            <div className="card" style={{ padding: 0, alignItems: "stretch" }}>
              {list.map((k) => (
                <div
                  key={k.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderTop: "1px solid var(--border)",
                    opacity: k.revokedAt ? 0.55 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      {k.name}{" "}
                      {k.revokedAt && (
                        <span className="tag" style={{ color: "#dc2626" }}>
                          revogada
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      <code>{k.prefix}…</code> · criada em {fmtDate(k.createdAt)} ·{" "}
                      {k.lastUsedAt ? `último uso ${fmtDate(k.lastUsedAt)}` : "nunca usada"}
                    </div>
                  </div>
                  {!k.revokedAt && (
                    <button
                      className="ghost"
                      style={{ color: "#dc2626" }}
                      disabled={revoke.isPending}
                      onClick={() => {
                        if (confirm(`Revogar a chave "${k.name}"? Quem usa ela para de funcionar.`))
                          revoke.mutate(k.id);
                      }}
                    >
                      Revogar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </Async>
    </>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
