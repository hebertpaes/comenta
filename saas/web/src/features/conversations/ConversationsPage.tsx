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
  const [showCatalog, setShowCatalog] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string>>({});

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
    mutationFn: ({ body, mediaUrl }: { body: string; mediaUrl?: string }) => {
      const fullText = mediaUrl ? `${body} ${mediaUrl}`.trim() : body;
      return conversations.sendMessage(selectedId as string, fullText);
    },
    onSuccess: async () => {
      setDraft("");
      setMediaUrlInput("");
      setShowMediaModal(false);
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
    if ((body || mediaUrlInput) && selectedId) {
      send.mutate({ body, mediaUrl: mediaUrlInput || undefined });
    }
  };

  const toggleTag = (tagId: string) => {
    if (!detail) return;
    const current = detail.tags.map((t) => t.id);
    const next = current.includes(tagId) ? current.filter((x) => x !== tagId) : [...current, tagId];
    setTags.mutate(next);
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setReactions((prev) => ({ ...prev, [msgId]: prev[msgId] === emoji ? "" : emoji }));
  };

  const activeTagIds = detail?.tags.map((t) => t.id) ?? [];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2>💬 Central WhatsApp Business API Oficial</h2>
          <p className="muted" style={{ marginTop: -8 }}>
            Atendimento oficial via Meta Cloud API com suporte a áudio, mídias, catálogo de cursos, tags e IA Gemini.
          </p>
        </div>
      </div>

      {/* Filtro por Filas de Atendimento */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
          Fila:
        </span>
        <button
          onClick={() => setFilterQueue("")}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            border: `1px solid ${filterQueue === "" ? "var(--accent)" : "var(--border)"}`,
            background: filterQueue === "" ? "var(--accent)" : "var(--panel)",
            color: filterQueue === "" ? "#fff" : "var(--text)",
          }}
        >
          Todas as Filas
        </button>
        {queues.map((q) => (
          <button
            key={q.id}
            onClick={() => setFilterQueue(q.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: `1px solid ${filterQueue === q.id ? q.color : "var(--border)"}`,
              background: filterQueue === q.id ? q.color : "var(--panel)",
              color: filterQueue === q.id ? "#fff" : "var(--text)",
            }}
          >
            {q.name}
          </button>
        ))}
      </div>

      <div className="convgrid">
        {/* Lista de Atendimentos */}
        <div className="list">
          <Async {...listQuery} onRetry={() => void listQuery.refetch()}>
            {(page) =>
              page.data.length === 0 ? (
                <div className="item muted">Nenhum atendimento ativo no momento</div>
              ) : (
                <>
                  {page.data.map((c) => {
                    const q = queueOf(c.queueId);
                    return (
                      <div
                        key={c.id}
                        className={`item ${selectedId === c.id ? "active" : ""}`}
                        onClick={() => navigate(`/conversas/${c.id}`)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div className="name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span>{c.contact.name || "Contato"}</span>
                            <span style={{ fontSize: 12, color: "#25D366" }}>✓</span>
                          </div>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>15:30</span>
                        </div>
                        <div
                          className="last"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 4,
                          }}
                        >
                          <span>
                            {c.contact.phone ?? ""}
                          </span>
                          {q && (
                            <span
                              className="tag"
                              style={{ background: q.color, color: "#fff", fontSize: 10, fontWeight: 700 }}
                            >
                              {q.name}
                            </span>
                          )}
                          {c.tags.map((t) => (
                            <span
                              key={t.id}
                              className="tag"
                              style={{ background: t.color, color: "#fff", fontSize: 10, fontWeight: 700 }}
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

        {/* Janela de Atendimento Chat WhatsApp */}
        <div className="thread">
          {!selectedId && <p className="muted" style={{ margin: "auto" }}>Selecione um atendimento para visualizar as mensagens.</p>}

          {selectedId && detailQuery.error && (
            <ErrorBox error={detailQuery.error} onRetry={() => void detailQuery.refetch()} />
          )}

          {selectedId && detail && (
            <>
              {/* Header do Contato */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--border)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #25D366, #128C7E)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18 }}>
                  {((detail?.contact?.name ?? "C")[0] ?? "C").toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{detail.contact?.name || "Contato"}</span>
                    <span style={{ fontSize: 13, color: "#25D366" }} title="Conta Comercial Verificada">✓</span>
                  </div>
                  {detail.contact?.phone && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      📱 {detail.contact.phone} · <span style={{ color: "#25D366", fontWeight: 700 }}>WhatsApp Oficial</span>
                    </div>
                  )}
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={detail.queueId ?? ""}
                    onChange={(e) => transfer.mutate(e.target.value)}
                    title="Transferir para fila"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 13,
                      background: "var(--panel2)",
                    }}
                  >
                    <option value="">Sem fila definida</option>
                    {queues.map((q) => (
                      <option key={q.id} value={q.id}>
                        ↪ {q.name}
                      </option>
                    ))}
                  </select>

                  {detail.contact?.phone && (
                    <a
                      href={`https://wa.me/${detail.contact.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "#25D366",
                        color: "#fff",
                        padding: "6px 14px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      💬 Direct WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Etiquetas WhatsApp Business */}
              {allTags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", alignSelf: "center" }}>Etiquetas:</span>
                  {allTags.map((t) => {
                    const on = activeTagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        title="clique para aplicar/remover etiqueta"
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          border: `1px solid ${t.color}`,
                          background: on ? t.color : "transparent",
                          color: on ? "#fff" : t.color,
                        }}
                      >
                        {on ? "✓ " : "+ "}
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <AiPanel conversationId={detail.id} />
              <NotesPanel conversationId={detail.id} />

              {/* Thread de Mensagens */}
              <div className="msgs">
                {detail.messages.map((msg) => (
                  <div key={msg.id} className={`bubble ${msg.direction}`} style={{ position: "relative" }}>
                    {msg.mediaUrl &&
                      (msg.contentType === "image" ? (
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={msg.mediaUrl}
                            alt=""
                            style={{
                              maxWidth: "100%",
                              borderRadius: 10,
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
                          style={{ display: "inline-block", marginBottom: msg.body ? 6 : 0, color: "inherit", fontWeight: 700 }}
                        >
                          📎 Abrir Arquivo / Mídia
                        </a>
                      ))}
                    <div>{msg.body}</div>

                    {/* Reações e Checkmarks de Leitura Oficial WhatsApp */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 11, opacity: 0.85 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {["👍", "❤️", "🔥"].map((emoji) => (
                          <span
                            key={emoji}
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            style={{ cursor: "pointer", padding: "1px 3px", borderRadius: 4, background: reactions[msg.id] === emoji ? "rgba(255,255,255,0.3)" : "transparent" }}
                          >
                            {emoji}
                          </span>
                        ))}
                        {reactions[msg.id] && <span>{reactions[msg.id]}</span>}
                      </div>

                      {msg.direction === "out" && (
                        <span style={{ color: "#60a5fa", fontWeight: 800 }}>✓✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {send.error && <ErrorBox error={send.error} />}

              {/* Modal / Painel de Catálogo de Cursos & Mídias */}
              {showCatalog && (
                <div className="card" style={{ padding: 12, marginBottom: 10, background: "var(--panel2)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>🛍️ Catálogo de Cursos ABACS & Hotmart:</div>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {[
                      { name: "Operador de Caixa", price: "R$ 99,00", url: "https://abacs.org.br/integracao/hotmart/hotmart.php?token=89945.18284682318tokenavancada&curso=77" },
                      { name: "Administrativo Completo", price: "R$ 99,00", url: "https://abacs.org.br/loja_virtual/vercombo.php?curso=Administrativo%20Completo" },
                      { name: "Engenharia de IA", price: "R$ 149,00", url: "http://localhost:8080/cursos" }
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setDraft(`🎓 *${item.name}* (${item.price})\nInscrição imediata no link: ${item.url}`);
                          setShowCatalog(false);
                        }}
                        style={{ fontSize: 12, padding: "6px 10px", background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
                      >
                        + Enviar Card {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showMediaModal && (
                <div className="card" style={{ padding: 12, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📷 Anexar Imagem ou Documento (URL):</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/imagem.png"
                      value={mediaUrlInput}
                      onChange={(e) => setMediaUrlInput(e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                    <button type="button" onClick={() => setShowMediaModal(false)} className="ghost" style={{ fontSize: 12 }}>OK</button>
                  </div>
                </div>
              )}

              {/* Respostas Rápidas */}
              {showQuick && quick.length > 0 && (
                <div
                  style={{
                    background: "var(--panel2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 8,
                    marginBottom: 8,
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
                        color: "var(--text)",
                      }}
                    >
                      <b>{qr.shortcut}</b> —{" "}
                      <span className="muted">{qr.message.slice(0, 70)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Composer Estilo WhatsApp Business */}
              <div className="composer">
                {quick.length > 0 && (
                  <button
                    type="button"
                    title="Respostas Rápidas"
                    onClick={() => setShowQuick((s) => !s)}
                    style={{ padding: "0 12px", background: "var(--panel2)", color: "var(--text)", border: "1px solid var(--border)" }}
                  >
                    ⚡
                  </button>
                )}
                <button
                  type="button"
                  title="Anexar Imagem/Mídia"
                  onClick={() => setShowMediaModal((s) => !s)}
                  style={{ padding: "0 12px", background: "var(--panel2)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  📷
                </button>
                <button
                  type="button"
                  title="Enviar Card do Catálogo"
                  onClick={() => setShowCatalog((s) => !s)}
                  style={{ padding: "0 12px", background: "var(--panel2)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  🛍️
                </button>

                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escreva uma mensagem no WhatsApp Business…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitDraft();
                  }}
                />
                <button onClick={submitDraft} disabled={send.isPending} style={{ background: "#25D366", color: "#fff", fontWeight: 800 }}>
                  {send.isPending ? "…" : "Enviar ✓"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
