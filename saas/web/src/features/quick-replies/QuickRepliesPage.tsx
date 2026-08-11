import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { quickReplies } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";

export function QuickRepliesPage() {
  const queryClient = useQueryClient();
  const [shortcut, setShortcut] = useState("");
  const [message, setMessage] = useState("");

  const query = useQuery({ queryKey: keys.quickReplies, queryFn: quickReplies.list });
  const reload = () => queryClient.invalidateQueries({ queryKey: keys.quickReplies });

  const create = useMutation({
    mutationFn: (body: { shortcut: string; message: string }) => quickReplies.create(body),
    onSuccess: () => {
      setShortcut("");
      setMessage("");
      void reload();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => quickReplies.remove(id),
    onSuccess: reload,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sc = shortcut.trim();
    const msg = message.trim();
    if (!sc || !msg) return;
    create.mutate({ shortcut: sc.startsWith("/") ? sc : `/${sc}`, message: msg });
  };

  return (
    <>
      <h2>Respostas rápidas</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Atalhos de mensagem que o atendente insere na conversa com um clique (botão ⚡ no chat).
      </p>

      <form
        onSubmit={submit}
        className="card"
        style={{ padding: 16, marginBottom: 18, maxWidth: 620, alignItems: "stretch" }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value)}
            placeholder="/atalho"
            aria-label="Atalho"
            style={{
              width: 140,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #d0d5dd",
            }}
          />
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Texto da mensagem"
            aria-label="Texto da mensagem"
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }}
          />
          <button disabled={create.isPending}>{create.isPending ? "…" : "➕ Criar"}</button>
        </div>
      </form>

      {(create.error ?? remove.error) && <ErrorBox error={create.error ?? remove.error} />}

      <Async {...query} onRetry={() => void query.refetch()}>
        {({ data: list }) =>
          list.length === 0 ? (
            <p className="muted">Nenhuma resposta rápida ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 680 }}>
              {list.map((qr) => (
                <div
                  key={qr.id}
                  className="card"
                  style={{
                    padding: 12,
                    flexDirection: "row",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span className="tag" style={{ background: "#eef2ff", color: "#4338ca" }}>
                    {qr.shortcut}
                  </span>
                  <span style={{ flex: 1, fontSize: 14 }}>{qr.message}</span>
                  <button
                    className="link"
                    style={{ color: "#dc2626" }}
                    onClick={() => {
                      if (confirm("Remover esta resposta rápida?")) remove.mutate(qr.id);
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )
        }
      </Async>
    </>
  );
}
