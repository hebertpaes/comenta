import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  conversations,
  queues as queuesApi,
  quickReplies,
  tags as tagsApi,
} from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";
import { AiPanel } from "./AiPanel";
import { NotesPanel } from "./NotesPanel";

export function ConversationsPage() {
  const { id: selectedId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filterQueue, setFilterQueue] = useState("");
  const [draft, setDraft] = useState("");
  const [showQuick, setShowQuick] = useState(false);

  const filters = filterQueue ? { queueId: filterQueue } : {};

  const listQuery = useQuery({
    queryKey: keys.conversations(filters),
    queryFn: () => conversations.list(filters),
  });
  const queuesQuery = useQuery({ queryKey: keys.queues, queryFn: queuesApi.list });
  const tagsQuery = useQuery({ queryKey: keys.tags, queryFn: tagsApi.list });
  const quickQuery = useQuery({ queryKey: keys.quickReplies, queryFn: quickReplies.list });

  const detailQuery = useQuery({
    queryKey: keys.conversation(selectedId ?? ""),
    queryFn: () => conversations.get(selectedId as string),
    enabled: Boolean(selectedId),
  });

  const queues = queuesQuery.data?.data ?? [];
  const allTags = tagsQuery.data?.data ?? [];
  const quick = quickQuery.data?.data ?? [];
  const detail = detailQuery.data;

  const queueOf = (id: string | null) => queues.find((q) => q.id === id);

  const refreshBoth = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.conversations(filters) }),
      selectedId
        ? queryClient.invalidateQueries({ queryKey: keys.conversation(selectedId) })
        : Promise.resolve(),
    ]);
  };

  const send = useMutation({
    mutationFn: (body: string) => conversations.sendMessage(selectedId as string, body),
    onSuccess: async () => {
      setDraft("");
      await refreshBoth();
    },
  });

  const transfer = useMutation({
    mutationFn: (queueId: string) =>
      conversations.update(selectedId as string, { queueId: queueId || null }),
    onSuccess: refreshBoth,
  });

  const setTags = useMutation({
    mutationFn: (tagIds: string[]) => conversations.setTags(selectedId as string, tagIds),
    onSuccess: refreshBoth,
  });

  const submitDraft = () => {
    const body = draft.trim();
    if (body && selectedId) send.mutate(body);
  };

  const toggleTag = (tagId: string) => {
    if (!detail) return;
    const current = detail.tags.map((t) => t.id);
    const next = current.includes(tagId) ? current.filter((x) => x !== tagId) : [...current, tagId];
    setTags.mutate(next);
  };

  const activeTagIds = detail?.tags.map((t) => t.id) ?? [];

  return (
    <>
      <h2>Conversas</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <span className="muted" style={{ fontSize: 13 }}>
          Fila:
        </span>
        <button
          onClick={() => setFilterQueue("")}
          style={{
            padding: "5px 12px",
            borderRadius: 999,
            fontSize: 13,
            cursor: "pointer",
            border: `1px solid ${filterQueue === "" ? "#6d28d9" : "#d0d5dd"}`,
            background: filterQueue === "" ? "#6d28d9" : "#fff",
            color: filterQueue === "" ? "#fff" : "#333",
          }}
        >
          Todas
        </button>
        {queues.map((q) => (
          <button
            key={q.id}
            onClick={() => setFilterQueue(q.id)}
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 13,
              cursor: "pointer",
              border: `1px solid ${filterQueue === q.id ? q.color : "#d0d5dd"}`,
              background: filterQueue === q.id ? q.color : "#fff",
              color: filterQueue === q.id ? "#fff" : "#333",
            }}
          >
            {q.name}
          </button>
        ))}
      </div>

      <div className="convgrid">
        <div className="list">
          <Async {...listQuery} onRetry={() => void listQuery.refetch()}>
            {(page) =>
              page.data.length === 0 ? (
                <div className="item muted">Nenhuma conversa</div>
              ) : (
                <>
                  {page.data.map((c) => {
                    const q = queueOf(c.queueId);
                    return (
                      <div
                        key={c.id}
                        className={`item ${selectedId === c.id ? "active" : ""}`}
                        // A conversa aberta vai no path: dá para mandar o link
                        // para um colega e o back do navegador funciona.
                        onClick={() => navigate(`/conversas/${c.id}`)}
                      >
                        <div className="name">{c.contact.name || "Contato"}</div>
                        <div
                          className="last"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            {c.status} · {c.contact.phone ?? ""}
                          </span>
                          {q && (
                            <span
                              className="tag"
                              style={{ background: q.color, color: "#fff", fontSize: 10 }}
                            >
                              {q.name}
                            </span>
                          )}
                          {c.tags.map((t) => (
                            <span
                              key={t.id}
                              className="tag"
                              style={{ background: t.color, color: "#fff", fontSize: 10 }}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )
            }
          </Async>
        </div>

        <div className="thread">
          {!selectedId && <p className="muted">Selecione uma conversa</p>}

          {selectedId && detailQuery.error && (
            <ErrorBox error={detailQuery.error} onRetry={() => void detailQuery.refetch()} />
          )}

          {selectedId && detail && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 600 }}>{detail.contact.name}</span>
                {detail.contact.phone && (
                  <span className="muted" style={{ fontSize: 13 }}>
                    📱 {detail.contact.phone}
                  </span>
                )}
                <select
                  value={detail.queueId ?? ""}
                  onChange={(e) => transfer.mutate(e.target.value)}
                  title="Transferir para fila"
                  style={{
                    marginLeft: "auto",
                    padding: "5px 8px",
                    borderRadius: 8,
                    border: "1px solid #d0d5dd",
                    fontSize: 13,
                  }}
                >
                  <option value="">Sem fila</option>
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      ↪ {q.name}
                    </option>
                  ))}
                </select>
                {detail.contact.phone && (
                  <a
                    href={`https://wa.me/${detail.contact.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#22c55e",
                      color: "#fff",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    💬 WhatsApp
                  </a>
                )}
              </div>

              {allTags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {allTags.map((t) => {
                    const on = activeTagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        title="clique para aplicar/remover"
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          cursor: "pointer",
                          border: `1px solid ${t.color}`,
                          background: on ? t.color : "#fff",
                          color: on ? "#fff" : t.color,
                        }}
                      >
                        {on ? "✓ " : ""}
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <AiPanel conversationId={detail.id} />
              <NotesPanel conversationId={detail.id} />

              <div className="msgs">
                {detail.messages.map((msg) => (
                  <div key={msg.id} className={`bubble ${msg.direction}`}>
                    {msg.mediaUrl &&
                      (msg.contentType === "image" ? (
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={msg.mediaUrl}
                            alt=""
                            style={{
                              maxWidth: "100%",
                              borderRadius: 8,
                              display: "block",
                              marginBottom: msg.body ? 6 : 0,
                            }}
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-block", marginBottom: msg.body ? 6 : 0 }}
                        >
                          📎 Abrir arquivo
                        </a>
                      ))}
                    {msg.body}
                  </div>
                ))}
              </div>

              {send.error && <ErrorBox error={send.error} />}

              {showQuick && quick.length > 0 && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: 8,
                    marginBottom: 6,
                    maxHeight: 160,
                    overflowY: "auto",
                  }}
                >
                  {quick.map((qr) => (
                    <button
                      key={qr.id}
                      type="button"
                      onClick={() => {
                        setDraft((d) => (d ? `${d} ` : "") + qr.message);
                        setShowQuick(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        padding: "6px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      <b>{qr.shortcut}</b> —{" "}
                      <span className="muted">{qr.message.slice(0, 70)}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="composer">
                {quick.length > 0 && (
                  <button
                    title="Respostas rápidas"
                    onClick={() => setShowQuick((s) => !s)}
                    style={{ padding: "0 12px" }}
                  >
                    ⚡
                  </button>
                )}
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escreva uma resposta…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitDraft();
                  }}
                />
                <button onClick={submitDraft} disabled={send.isPending}>
                  {send.isPending ? "…" : "Enviar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
