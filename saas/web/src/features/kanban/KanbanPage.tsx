import type { ConversationListItem, ConversationStatus } from "@comenta/shared";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { conversations, queues as queuesApi } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { ErrorBox, Loading } from "../../components/Async";

const COLUMNS: { key: ConversationStatus; label: string; color: string }[] = [
  { key: "pending", label: "⏳ Aguardando / Triagem", color: "#d97706" },
  { key: "open", label: "💬 Em Atendimento / Comercial", color: "#2563eb" },
  { key: "resolved", label: "✅ Resolvido / Fechado", color: "#16a34a" },
];

interface Drag {
  id: string;
  from: ConversationStatus;
}

export function KanbanPage() {
  const queryClient = useQueryClient();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<ConversationStatus | null>(null);

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
    setHoveredColumn(null);
    if (!current || current.from === to) return;
    move.mutate({ id: current.id, to });
  };

  const anyError = columnQueries.find((q) => q.error)?.error ?? move.error;
  const loading = columnQueries.some((q) => q.isPending);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2>📋 Quadro Kanban de Negociações — Arraste e Solte</h2>
          <p className="muted" style={{ marginTop: -8, maxWidth: 680 }}>
            Arraste os cards entre as colunas para alterar o status da conversa e avançar nas etapas do funil.
          </p>
        </div>
      </div>

      {anyError && <ErrorBox error={anyError} />}
      {loading && <Loading />}

      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          overflowX: "auto",
          paddingBottom: 12,
        }}
      >
        {COLUMNS.map((col, i) => {
          const cards = columnQueries[i]?.data?.data ?? [];
          const isHovered = hoveredColumn === col.key;

          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setHoveredColumn(col.key);
              }}
              onDragLeave={() => setHoveredColumn(null)}
              onDrop={() => onDrop(col.key)}
              style={{
                flex: "1 0 280px",
                minWidth: 280,
                background: isHovered ? "rgba(109, 40, 217, 0.08)" : "var(--panel2)",
                borderRadius: 14,
                padding: 12,
                border: isHovered ? "2px dashed #6d28d9" : "1px solid var(--border)",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 999, background: col.color }} />
                {col.label}
                <span className="muted" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700 }}>
                  {cards.length}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 100 }}>
                {cards.length === 0 && (
                  <div
                    className="muted"
                    style={{
                      fontSize: 12,
                      padding: 16,
                      textAlign: "center",
                      border: "1px dashed var(--border)",
                      borderRadius: 8,
                    }}
                  >
                    Nenhuma conversa nesta etapa
                  </div>
                )}
                {cards.map((c) => {
                  const q = queueOf(c.queueId);
                  const isBeingDragged = drag?.id === c.id;

                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDrag({ id: c.id, from: col.key })}
                      className="card"
                      style={{
                        padding: 14,
                        textAlign: "left",
                        alignItems: "stretch",
                        cursor: "grab",
                        opacity: isBeingDragged ? 0.4 : 1,
                        border: "1px solid var(--border)",
                        boxShadow: "0 2px 4px rgba(0,0,0,.06)",
                        borderRadius: 10,
                        transition: "transform 0.1s ease, box-shadow 0.1s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                          {c.contact.name || "Contato"}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>✋ Arraste</span>
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {c.contact.phone ?? ""}
                      </div>
                      {q && (
                        <span
                          className="tag"
                          style={{
                            background: q.color,
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            marginTop: 8,
                            alignSelf: "flex-start",
                            padding: "3px 8px",
                            borderRadius: 6,
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
