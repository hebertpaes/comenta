import type { ConversationListItem, ConversationStatus } from "@comenta/shared";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { conversations, queues as queuesApi } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { ErrorBox, Loading } from "../../components/Async";

const COLUMNS: { key: ConversationStatus; label: string; color: string }[] = [
  { key: "pending", label: "Aguardando", color: "#d97706" },
  { key: "open", label: "Em atendimento", color: "#2563eb" },
  { key: "resolved", label: "Resolvido", color: "#16a34a" },
];

interface Drag {
  id: string;
  from: ConversationStatus;
}

export function KanbanPage() {
  const queryClient = useQueryClient();
  const [drag, setDrag] = useState<Drag | null>(null);

  // Uma query por coluna: cada uma tem sua chave de cache, então mover um card
  // invalida só o que precisa em vez de recarregar o quadro inteiro.
  const columnQueries = useQueries({
    queries: COLUMNS.map((col) => ({
      queryKey: keys.conversations({ status: col.key }),
      queryFn: () => conversations.list({ status: col.key }),
    })),
  });

  const queuesQuery = useQuery({ queryKey: keys.queues, queryFn: queuesApi.list });
  const queues = queuesQuery.data?.data ?? [];
  const queueOf = (id: string | null) => queues.find((q) => q.id === id);

  const move = useMutation({
    mutationFn: ({ id, to }: { id: string; to: ConversationStatus }) =>
      conversations.update(id, { status: to }),
    // Move otimista: o card salta de coluna na hora e, se a API recusar, o
    // onSettled recarrega e devolve o quadro ao estado real.
    onMutate: async ({ id, to }) => {
      const from = drag?.from;
      if (!from || from === to) return;

      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const fromKey = keys.conversations({ status: from });
      const toKey = keys.conversations({ status: to });
      const fromPage = queryClient.getQueryData<{ data: ConversationListItem[] }>(fromKey);
      const card = fromPage?.data.find((c) => c.id === id);
      if (!card) return;

      queryClient.setQueryData(fromKey, (old: { data: ConversationListItem[] } | undefined) =>
        old ? { ...old, data: old.data.filter((c) => c.id !== id) } : old
      );
      queryClient.setQueryData(toKey, (old: { data: ConversationListItem[] } | undefined) =>
        old ? { ...old, data: [{ ...card, status: to }, ...old.data] } : old
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const onDrop = (to: ConversationStatus) => {
    const current = drag;
    setDrag(null);
    if (!current || current.from === to) return;
    move.mutate({ id: current.id, to });
  };

  const anyError = columnQueries.find((q) => q.error)?.error ?? move.error;
  const loading = columnQueries.some((q) => q.isPending);

  return (
    <>
      <h2>Kanban</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Arraste as conversas entre as etapas. Mover um card muda o status da conversa.
      </p>

      {anyError && <ErrorBox error={anyError} />}
      {loading && <Loading />}

      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {COLUMNS.map((col, i) => {
          const cards = columnQueries[i]?.data?.data ?? [];
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.key)}
              style={{
                flex: "1 0 260px",
                minWidth: 260,
                background: "#f8fafc",
                borderRadius: 12,
                padding: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 999, background: col.color }} />
                {col.label}
                <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
                  {cards.length}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                {cards.length === 0 && (
                  <div className="muted" style={{ fontSize: 12, padding: 8 }}>
                    Vazio
                  </div>
                )}
                {cards.map((c) => {
                  const q = queueOf(c.queueId);
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDrag({ id: c.id, from: col.key })}
                      className="card"
                      style={{
                        padding: 12,
                        textAlign: "left",
                        alignItems: "stretch",
                        cursor: "grab",
                        boxShadow: "0 1px 2px rgba(0,0,0,.06)",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {c.contact.name || "Contato"}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {c.contact.phone ?? ""}
                      </div>
                      {q && (
                        <span
                          className="tag"
                          style={{
                            background: q.color,
                            color: "#fff",
                            fontSize: 10,
                            marginTop: 6,
                            alignSelf: "flex-start",
                          }}
                        >
                          {q.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
