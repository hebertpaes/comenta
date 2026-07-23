import React, { useEffect, useState } from "react";
import { api, isLoggedIn } from "./api.js";

const Logo = () => (
  <div className="brand">
    <span className="dot">💬</span> Comenta
  </div>
);

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ companyName: "", name: "", email: "admin@comenta.com.br", password: "comenta123" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (mode === "login") await api.login(f.email, f.password);
      else await api.signup(f.companyName, f.name, f.email, f.password);
      onLogin();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <form className="login" onSubmit={submit}>
      <Logo />
      <p className="muted">Plataforma de atendimento multicanal</p>
      {mode === "signup" && (
        <>
          <div className="field"><label>Empresa</label><input value={f.companyName} onChange={set("companyName")} required /></div>
          <div className="field"><label>Seu nome</label><input value={f.name} onChange={set("name")} required /></div>
        </>
      )}
      <div className="field"><label>E-mail</label><input type="email" value={f.email} onChange={set("email")} required /></div>
      <div className="field"><label>Senha</label><input type="password" value={f.password} onChange={set("password")} required /></div>
      {err && <div className="err">{err}</div>}
      <button style={{ width: "100%", marginTop: 8 }} disabled={busy}>{busy ? "..." : mode === "login" ? "Entrar" : "Criar conta"}</button>
      <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
        {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
        <button type="button" className="link" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Criar empresa" : "Entrar"}
        </button>
      </p>
    </form>
  );
}

function Dashboard() {
  const [m, setM] = useState(null);
  useEffect(() => { api.metrics().then(setM).catch(() => {}); }, []);
  if (!m) return <p className="muted">Carregando…</p>;
  const cards = [
    ["Em atendimento", m.conversations.open, ""],
    ["Aguardando", m.conversations.pending, ""],
    ["Resolvidas", m.conversations.resolved, ""],
    ["Mensagens hoje", m.messagesToday, ""],
    ["Contatos", m.contacts, ""],
    ["1ª resposta (méd.)", m.avgFirstResponseSeconds != null ? `${Math.round(m.avgFirstResponseSeconds)}s` : "—", ""],
  ];
  return (
    <>
      <h2>Dashboard</h2>
      <div className="cards">
        {cards.map(([l, n]) => (
          <div className="card" key={l}><div className="n">{n}</div><div className="l">{l}</div></div>
        ))}
      </div>
    </>
  );
}

function AiPanel({ conversationId }) {
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState("");
  const run = async (kind, fn) => {
    setBusy(kind); setOut(null);
    try { setOut({ kind, data: await fn(conversationId) }); }
    catch (e) { setOut({ kind, error: e.message }); }
    finally { setBusy(""); }
  };
  return (
    <div>
      <div className="aibar">
        <button disabled={!!busy} onClick={() => run("classify", api.aiClassify)}>{busy === "classify" ? "…" : "🏷️ Classificar"}</button>
        <button disabled={!!busy} onClick={() => run("summary", api.aiSummary)}>{busy === "summary" ? "…" : "📝 Resumir"}</button>
        <button disabled={!!busy} onClick={() => run("suggest", api.aiSuggest)}>{busy === "suggest" ? "…" : "✨ Sugerir resposta"}</button>
      </div>
      {out && out.error && <div className="aibox" style={{ borderColor: "#ff6b6b" }}>IA: {out.error}</div>}
      {out && !out.error && out.kind === "classify" && (
        <div className="aibox">
          <span className="tag">{out.data.category}</span>
          <span className="tag">{out.data.sentiment}</span>
          <span className="tag">urgência: {out.data.urgency}</span>
          <div style={{ marginTop: 8 }}><b>{out.data.intent}</b> — {out.data.summary}</div>
        </div>
      )}
      {out && !out.error && out.kind === "summary" && <div className="aibox">{out.data.summary}</div>}
      {out && !out.error && out.kind === "suggest" && <div className="aibox">{out.data.suggestion}</div>}
    </div>
  );
}

const STATUS_META = {
  connected: { label: "Conectado", color: "#22c55e", bg: "#dcfce7" },
  connecting: { label: "Conectando…", color: "#d97706", bg: "#fef3c7" },
  configured: { label: "Configurado", color: "#2563eb", bg: "#dbeafe" },
  disconnected: { label: "Desconectado", color: "#64748b", bg: "#f1f5f9" },
};

// Card de uma conexão de WhatsApp (QR real, status ao vivo).
function WhatsappCard({ ch, isAdmin, onChanged }) {
  const [st, setSt] = useState({ status: ch.status, qr: ch.live?.qr || null, phone: ch.live?.phone || (ch.config || {}).phone || null });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    const tick = () => api.channelStatus(ch.id).then((s) => { if (alive) setSt(s); }).catch(() => {});
    tick();
    const t = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [ch.id]);

  const connect = async () => { setBusy(true); try { setSt(await api.channelConnect(ch.id)); } catch (e) { alert(e.message); } finally { setBusy(false); } };
  const disconnect = async () => { setBusy(true); try { setSt(await api.channelDisconnect(ch.id)); onChanged?.(); } catch (e) { alert(e.message); } finally { setBusy(false); } };
  const remove = async () => { if (confirm(`Remover a conexão "${ch.name}"?`)) { await api.channelDelete(ch.id); onChanged?.(); } };

  const meta = STATUS_META[st.status] || STATUS_META.disconnected;
  return (
    <div className="card" style={{ padding: 18, textAlign: "left", alignItems: "stretch", maxWidth: 380 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>🟢</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{ch.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>WhatsApp {st.phone ? `· ${st.phone}` : ""}</div>
        </div>
        <span className="tag" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
      </div>

      {st.status === "connecting" && st.qr && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <img src={st.qr} alt="QR do WhatsApp" width={220} height={220} style={{ borderRadius: 12, background: "#fff", padding: 8 }} />
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> e aponte para o QR.</p>
        </div>
      )}
      {st.status === "connecting" && !st.qr && <div className="aibox" style={{ marginTop: 12 }}>⏳ Gerando QR Code…</div>}
      {st.demo && <p className="muted" style={{ fontSize: 11, marginTop: 10, opacity: 0.8 }}>Modo demonstração (sem a lib Baileys): pareamento simulado.</p>}

      {isAdmin && (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {st.status === "connected" || st.status === "connecting"
            ? <button disabled={busy} onClick={disconnect}>{st.status === "connecting" ? "Cancelar" : "Desconectar"}</button>
            : <button disabled={busy} onClick={connect}>{busy ? "Gerando…" : "📲 Conectar"}</button>}
          <button className="link" style={{ color: "#dc2626" }} onClick={remove}>Remover</button>
        </div>
      )}
    </div>
  );
}

// Card de um canal não-WhatsApp (encaixe pronto: configurar credenciais).
// Campos de configuração por tipo de canal (em vez de JSON cru).
const CHANNEL_FIELDS = {
  telegram: [{ key: "botToken", label: "Bot Token (@BotFather)", ph: "123456:ABC-DEF..." }],
  instagram: [
    { key: "accessToken", label: "Access Token (Meta)", ph: "EAAB..." },
    { key: "igBusinessId", label: "Instagram Business ID", ph: "1784XXXXXXXX" },
  ],
  facebook: [
    { key: "pageAccessToken", label: "Page Access Token", ph: "EAAB..." },
    { key: "pageId", label: "Page ID", ph: "1029XXXXXXXX" },
  ],
  email: [
    { key: "imapHost", label: "IMAP host", ph: "imap.gmail.com" },
    { key: "imapPort", label: "IMAP porta", ph: "993" },
    { key: "user", label: "Usuário / E-mail", ph: "voce@empresa.com" },
    { key: "password", label: "Senha", type: "password", ph: "••••••••" },
    { key: "smtpHost", label: "SMTP host", ph: "smtp.gmail.com" },
    { key: "smtpPort", label: "SMTP porta", ph: "587" },
  ],
};

function ChannelCard({ ch, meta, isAdmin, onChanged }) {
  const fields = CHANNEL_FIELDS[ch.type] || [];
  const [form, setForm] = useState(() => {
    const c = ch.config || {};
    const init = {};
    for (const f of fields) init[f.key] = c[f.key] != null ? String(c[f.key]) : "";
    return init;
  });
  const [busy, setBusy] = useState(false);
  const status = ch.type === "widget" ? "connected" : ch.status;
  const sm = STATUS_META[status] || STATUS_META.disconnected;
  const isLive = status === "connected" || status === "configured";
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const connect = async () => {
    const cfg = {};
    for (const f of fields) if (form[f.key]?.trim()) cfg[f.key] = form[f.key].trim();
    if (fields.length && !Object.keys(cfg).length) return alert("Preencha as credenciais para conectar.");
    setBusy(true);
    try {
      await api.channelUpdate(ch.id, { config: cfg });
      await api.channelConnect(ch.id);
      onChanged?.();
    } catch (e) { alert(e.message); } finally { setBusy(false); }
  };
  const disconnect = async () => { setBusy(true); try { await api.channelDisconnect(ch.id); onChanged?.(); } catch (e) { alert(e.message); } finally { setBusy(false); } };
  const remove = async () => { if (confirm(`Remover a conexão "${ch.name}"?`)) { await api.channelDelete(ch.id); onChanged?.(); } };

  return (
    <div className="card" style={{ padding: 18, textAlign: "left", alignItems: "stretch", maxWidth: 380 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>{meta?.icon || "🔌"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{ch.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>{meta?.label || ch.type}</div>
        </div>
        <span className="tag" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{meta?.help}</p>

      {ch.type === "widget" ? (
        isAdmin && <div style={{ marginTop: 12 }}><button className="link" style={{ color: "#dc2626" }} onClick={remove}>Remover</button></div>
      ) : isLive ? (
        isAdmin && (
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button disabled={busy} onClick={disconnect}>Desconectar</button>
            <button className="link" style={{ color: "#dc2626" }} onClick={remove}>Remover</button>
          </div>
        )
      ) : isAdmin ? (
        <div style={{ marginTop: 12 }}>
          {fields.map((f) => (
            <div className="field" key={f.key} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12 }}>{f.label}</label>
              <input type={f.type || "text"} value={form[f.key]} onChange={set(f.key)} placeholder={f.ph}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button disabled={busy} onClick={connect}>{busy ? "Conectando…" : "Conectar"}</button>
            <button className="link" style={{ color: "#dc2626" }} onClick={remove}>Remover</button>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Somente administradores configuram este canal.</p>
      )}
    </div>
  );
}

function Connections({ isAdmin }) {
  const [list, setList] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [adding, setAdding] = useState(false);
  const load = () => api.channels().then((r) => { setList(r.data || []); setCatalog(r.catalog || []); }).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const add = async (type) => {
    setAdding(true);
    try { await api.channelCreate(type); await load(); } catch (e) { alert(e.message); } finally { setAdding(false); }
  };
  const metaOf = (type) => catalog.find((c) => c.type === type);

  return (
    <>
      <h2>Conexões</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Conecte vários canais e vários números ao mesmo tempo. WhatsApp é conexão real (QR);
        os demais canais já têm o encaixe pronto para receber as credenciais.
      </p>

      {isAdmin && (
        <div className="card" style={{ padding: 16, marginBottom: 18, textAlign: "left", alignItems: "stretch", maxWidth: 680 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Adicionar conexão</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {catalog.map((c) => (
              <button key={c.type} disabled={adding} onClick={() => add(c.type)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, border: "1px solid #d0d5dd", background: "#fff", color: "#1f2937", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {list === null && <p className="muted">Carregando…</p>}
      {list && list.length === 0 && <p className="muted">Nenhuma conexão ainda{isAdmin ? " — adicione uma acima." : "."}</p>}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {list && list.map((ch) => (
          ch.type === "whatsapp"
            ? <WhatsappCard key={ch.id} ch={ch} isAdmin={isAdmin} onChanged={load} />
            : <ChannelCard key={ch.id} ch={ch} meta={metaOf(ch.type)} isAdmin={isAdmin} onChanged={load} />
        ))}
      </div>
    </>
  );
}

// Notas internas de uma conversa.
function NotesPanel({ conversationId }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const load = () => api.notes(conversationId).then((r) => setNotes(r.data || [])).catch(() => {});
  useEffect(() => { if (open) load(); }, [conversationId, open]);
  const add = async () => { if (!text.trim()) return; await api.noteCreate(conversationId, text.trim()); setText(""); load(); };
  const del = async (id) => { await api.noteDelete(id); load(); };
  return (
    <div style={{ marginTop: 8 }}>
      <button className="link" onClick={() => setOpen((o) => !o)}>🗒️ Notas internas {open ? "▲" : "▼"} {notes.length ? `(${notes.length})` : ""}</button>
      {open && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10, marginTop: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Anotação visível só para a equipe…"
              onKeyDown={(e) => e.key === "Enter" && add()}
              style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #d0d5dd" }} />
            <button onClick={add}>Anotar</button>
          </div>
          {notes.map((n) => (
            <div key={n.id} style={{ fontSize: 13, marginTop: 8, borderTop: "1px dashed #fde68a", paddingTop: 6 }}>
              <div>{n.body}</div>
              <div className="muted" style={{ fontSize: 11, display: "flex", gap: 8 }}>
                <span>{n.author || "—"}</span>
                <button className="link" style={{ color: "#dc2626", fontSize: 11 }} onClick={() => del(n.id)}>remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Conversations() {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [draft, setDraft] = useState("");
  const [queues, setQueues] = useState([]);
  const [filterQueue, setFilterQueue] = useState("");
  const [allTags, setAllTags] = useState([]);
  const [quick, setQuick] = useState([]);
  const [showQuick, setShowQuick] = useState(false);

  const queueOf = (id) => queues.find((q) => q.id === id);
  const load = () => api.conversations(filterQueue ? { queueId: filterQueue } : {}).then((r) => setList(r.data || [])).catch(() => {});
  useEffect(() => {
    api.queues().then((r) => setQueues(r.data || [])).catch(() => {});
    api.tags().then((r) => setAllTags(r.data || [])).catch(() => {});
    api.quickReplies().then((r) => setQuick(r.data || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [filterQueue]);
  useEffect(() => { if (sel) api.conversation(sel).then(setDetail).catch(() => {}); }, [sel]);

  const send = async () => {
    if (!draft.trim() || !sel) return;
    await api.sendMessage(sel, draft.trim());
    setDraft("");
    api.conversation(sel).then(setDetail);
  };
  const transfer = async (queueId) => {
    if (!sel) return;
    await api.conversationUpdate(sel, { queueId: queueId || null });
    api.conversation(sel).then(setDetail);
    load();
  };
  const toggleTag = async (tagId) => {
    if (!detail) return;
    const cur = (detail.tags || []).map((t) => t.id);
    const next = cur.includes(tagId) ? cur.filter((x) => x !== tagId) : [...cur, tagId];
    await api.conversationSetTags(detail.id, next);
    api.conversation(detail.id).then(setDetail);
    load();
  };
  const insertQuick = (msg) => { setDraft((d) => (d ? d + " " : "") + msg); setShowQuick(false); };

  const activeTagIds = (detail?.tags || []).map((t) => t.id);

  return (
    <>
      <h2>Conversas</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: 13 }}>Fila:</span>
        <button onClick={() => setFilterQueue("")}
          style={{ padding: "5px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
            border: "1px solid " + (filterQueue === "" ? "#6d28d9" : "#d0d5dd"), background: filterQueue === "" ? "#6d28d9" : "#fff", color: filterQueue === "" ? "#fff" : "#333" }}>
          Todas
        </button>
        {queues.map((q) => (
          <button key={q.id} onClick={() => setFilterQueue(q.id)}
            style={{ padding: "5px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
              border: "1px solid " + (filterQueue === q.id ? q.color : "#d0d5dd"), background: filterQueue === q.id ? q.color : "#fff", color: filterQueue === q.id ? "#fff" : "#333" }}>
            {q.name}
          </button>
        ))}
      </div>
      <div className="convgrid">
        <div className="list">
          {list.length === 0 && <div className="item muted">Nenhuma conversa</div>}
          {list.map((c) => {
            const q = queueOf(c.queueId);
            return (
              <div key={c.id} className={`item ${sel === c.id ? "active" : ""}`} onClick={() => setSel(c.id)}>
                <div className="name">{c.contact?.name || "Contato"}</div>
                <div className="last" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>{c.status} · {c.contact?.phone || ""}</span>
                  {q && <span className="tag" style={{ background: q.color, color: "#fff", fontSize: 10 }}>{q.name}</span>}
                  {(c.tags || []).map((t) => <span key={t.id} className="tag" style={{ background: t.color, color: "#fff", fontSize: 10 }}>{t.name}</span>)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="thread">
          {!detail && <p className="muted">Selecione uma conversa</p>}
          {detail && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>{detail.contact?.name}</span>
                {detail.contact?.phone && (
                  <span className="muted" style={{ fontSize: 13 }}>📱 {detail.contact.phone}</span>
                )}
                <select value={detail.queueId || ""} onChange={(e) => transfer(e.target.value)}
                  title="Transferir para fila"
                  style={{ marginLeft: "auto", padding: "5px 8px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 13 }}>
                  <option value="">Sem fila</option>
                  {queues.map((q) => <option key={q.id} value={q.id}>↪ {q.name}</option>)}
                </select>
                {detail.contact?.phone && (
                  <a href={`https://wa.me/${detail.contact.phone.replace(/\D/g, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ background: "#22c55e", color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                  >💬 WhatsApp</a>
                )}
              </div>

              {allTags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {allTags.map((t) => {
                    const on = activeTagIds.includes(t.id);
                    return (
                      <button key={t.id} onClick={() => toggleTag(t.id)} title="clique para aplicar/remover"
                        style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, cursor: "pointer",
                          border: "1px solid " + t.color, background: on ? t.color : "#fff", color: on ? "#fff" : t.color }}>
                        {on ? "✓ " : ""}{t.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <AiPanel conversationId={detail.id} />
              <NotesPanel conversationId={detail.id} />
              <div className="msgs">
                {(detail.messages || []).map((msg) => (
                  <div key={msg.id} className={`bubble ${msg.direction}`}>{msg.body}</div>
                ))}
              </div>

              {showQuick && quick.length > 0 && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginBottom: 6, maxHeight: 160, overflowY: "auto" }}>
                  {quick.map((qr) => (
                    <div key={qr.id} onClick={() => insertQuick(qr.message)}
                      style={{ padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eef2ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <b>{qr.shortcut}</b> — <span className="muted">{qr.message.slice(0, 70)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="composer">
                {quick.length > 0 && (
                  <button title="Respostas rápidas" onClick={() => setShowQuick((s) => !s)}
                    style={{ padding: "0 12px" }}>⚡</button>
                )}
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escreva uma resposta…"
                  onKeyDown={(e) => e.key === "Enter" && send()} />
                <button onClick={send}>Enviar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const AUTOMATION_TYPES = {
  welcome: {
    label: "Boas-vindas",
    icon: "👋",
    hint: "Responde automaticamente na 1ª mensagem de cada nova conversa.",
  },
  business_hours: {
    label: "Fora do horário",
    icon: "🕐",
    hint: "Responde só quando o cliente escreve fora do horário de atendimento.",
  },
  keyword: {
    label: "Palavra-chave",
    icon: "🔑",
    hint: "Responde quando a mensagem do cliente contém um dos termos.",
  },
};

// Formulário de criação de uma nova regra (bot de fluxo).
function AutomationForm({ onCreate }) {
  const [type, setType] = useState("welcome");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [keywords, setKeywords] = useState("");
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const DAYS = [["Seg", 1], ["Ter", 2], ["Qua", 3], ["Qui", 4], ["Sex", 5], ["Sáb", 6], ["Dom", 7]];
  const toggleDay = (d) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    let config = {};
    if (type === "welcome") {
      if (!message.trim()) return setErr("Escreva a mensagem de boas-vindas.");
      config = { message: message.trim() };
    } else if (type === "business_hours") {
      if (!message.trim()) return setErr("Escreva a mensagem de fora do horário.");
      if (!days.length) return setErr("Escolha ao menos um dia de atendimento.");
      config = { days, start, end, message: message.trim() };
    } else if (type === "keyword") {
      const kws = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      if (!kws.length) return setErr("Informe ao menos uma palavra-chave.");
      if (!reply.trim()) return setErr("Escreva a resposta da regra.");
      config = { keywords: kws, reply: reply.trim() };
    }
    setBusy(true);
    try {
      await onCreate({ name: name.trim() || AUTOMATION_TYPES[type].label, type, config });
      setName(""); setMessage(""); setReply(""); setKeywords("");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <form className="card" style={{ maxWidth: 520, padding: 20 }} onSubmit={submit}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Nova regra</div>
      <div className="field">
        <label>Tipo</label>
        <select value={type} onChange={(e) => setType(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }}>
          {Object.entries(AUTOMATION_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{AUTOMATION_TYPES[type].hint}</p>
      </div>
      <div className="field"><label>Nome (opcional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={AUTOMATION_TYPES[type].label} /></div>

      {type === "keyword" ? (
        <>
          <div className="field"><label>Palavras-chave (separadas por vírgula)</label>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="preço, valor, planos, quanto custa" /></div>
          <div className="field"><label>Resposta</label>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
              placeholder="Nossos planos: Free, Pro e Business…"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd", resize: "vertical" }} /></div>
        </>
      ) : (
        <>
          {type === "business_hours" && (
            <>
              <div className="field"><label>Dias de atendimento</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DAYS.map(([lbl, d]) => (
                    <button type="button" key={d} onClick={() => toggleDay(d)}
                      style={{
                        padding: "5px 10px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                        border: "1px solid " + (days.includes(d) ? "#6d28d9" : "#d0d5dd"),
                        background: days.includes(d) ? "#6d28d9" : "#fff",
                        color: days.includes(d) ? "#fff" : "#333",
                      }}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="field" style={{ flex: 1 }}><label>Abre</label>
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
                <div className="field" style={{ flex: 1 }}><label>Fecha</label>
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
              </div>
            </>
          )}
          <div className="field"><label>Mensagem</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
              placeholder={type === "welcome"
                ? "Olá! 👋 Recebemos sua mensagem e já vamos te atender."
                : "Estamos fora do horário (seg–sex, 9h–18h). Retornamos em breve!"}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd", resize: "vertical" }} /></div>
        </>
      )}

      {err && <div className="err">{err}</div>}
      <button disabled={busy} style={{ marginTop: 8 }}>{busy ? "Salvando…" : "➕ Criar regra"}</button>
    </form>
  );
}

function Automations() {
  const [list, setList] = useState(null);
  const load = () => api.automations().then((r) => setList(r.data || [])).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const create = async (body) => { await api.automationCreate(body); await load(); };
  const toggle = async (a) => { await api.automationUpdate(a.id, { isActive: !a.isActive }); await load(); };
  const remove = async (a) => {
    if (!confirm(`Remover a regra "${a.name}"?`)) return;
    await api.automationDelete(a.id); await load();
  };

  const describe = (a) => {
    const c = a.config || {};
    if (a.type === "keyword") return `Se contém: ${(c.keywords || []).join(", ")} → responde`;
    if (a.type === "business_hours") return `Fora de ${c.start || "09:00"}–${c.end || "18:00"} → responde`;
    return String(c.message || "").slice(0, 80);
  };

  return (
    <>
      <h2>Automações</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 620 }}>
        Regras que respondem ou roteiam a conversa sozinhas quando o cliente escreve — no chat do site e no
        WhatsApp. A resposta do bot aparece no painel, no chat e vai ao WhatsApp do cliente (se conectado).
      </p>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <AutomationForm onCreate={create} />
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Regras ativas</div>
          {list === null && <p className="muted">Carregando…</p>}
          {list && list.length === 0 && <p className="muted">Nenhuma regra ainda. Crie a primeira ao lado.</p>}
          {list && list.map((a) => {
            const meta = AUTOMATION_TYPES[a.type] || { icon: "⚙️", label: a.type };
            return (
              <div key={a.id} className="card" style={{ padding: 14, marginBottom: 10, opacity: a.isActive ? 1 : 0.55 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{meta.label}</div>
                  </div>
                  <span className="tag" style={{ background: a.isActive ? "#dcfce7" : "#f1f5f9", color: a.isActive ? "#166534" : "#64748b" }}>
                    {a.isActive ? "ativa" : "pausada"}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>{describe(a)}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="link" onClick={() => toggle(a)}>{a.isActive ? "Pausar" : "Ativar"}</button>
                  <button className="link" style={{ color: "#dc2626" }} onClick={() => remove(a)}>Remover</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Catálogo de ferramentas open-source (Fase 5). São serviços opt-in do
// docker-compose (profile "tools"); aqui a gente descreve, ensina e abre.
const TOOLS = [
  {
    key: "n8n",
    icon: "🔗",
    name: "n8n — Automação",
    url: "http://localhost:5678",
    tagline: "Conecte o Comenta a centenas de apps por webhooks, sem código.",
    uses: [
      "Ao abrir uma conversa (evento conversation.created), criar card no Trello/CRM.",
      "Encaminhar mensagens novas para e-mail, Slack, Google Sheets.",
      "Disparar campanhas e follow-ups automáticos.",
    ],
    training: [
      "1. Suba o n8n e crie a conta local (1º acesso).",
      "2. Novo workflow → nó Webhook → copie a URL.",
      "3. No painel, cadastre essa URL em Webhooks do Comenta.",
      "4. Adicione nós (e-mail, Sheets…) e ative o workflow.",
    ],
  },
  {
    key: "metabase",
    icon: "📊",
    name: "Metabase — BI & Relatórios",
    url: "http://localhost:3001",
    tagline: "Dashboards e relatórios sobre atendimentos, times e SLA.",
    uses: [
      "Volume de conversas por dia, time e canal.",
      "Tempo de 1ª resposta e taxa de resolução.",
      "Painéis para a diretoria, atualizados sozinhos.",
    ],
    training: [
      "1. Suba o Metabase e crie o admin (1º acesso).",
      "2. Conecte no Postgres do Comenta (host: postgres, db: comenta_saas).",
      "3. Monte perguntas (Questions) e junte em um Dashboard.",
      "4. Agende envio por e-mail dos relatórios.",
    ],
  },
  {
    key: "nocodb",
    icon: "🗂️",
    name: "NocoDB — Banco no-code",
    url: "http://localhost:8090",
    tagline: "Planilhas inteligentes / mini-CRM que a equipe monta sozinha.",
    uses: [
      "Base de clientes, contratos e catálogos de produtos.",
      "Kanban e grades sem depender de TI.",
      "Fonte de dados para o n8n e para formulários.",
    ],
    training: [
      "1. Suba o NocoDB e crie o admin (1º acesso).",
      "2. Nova Base → importe uma planilha ou comece do zero.",
      "3. Crie visões (grade, kanban, calendário).",
      "4. Gere uma API/webhook para integrar com o n8n.",
    ],
  },
];

function Tools() {
  const [open, setOpen] = useState(null);
  return (
    <>
      <h2>Ferramentas</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 8, maxWidth: 680 }}>
        Ferramentas open-source que ampliam o Comenta — como <b>produto</b>, <b>serviço</b> e
        <b> treinamento</b> para a sua equipe. Elas não sobem por padrão: ligue só as que quiser.
      </p>
      <div className="aibox" style={{ maxWidth: 680, marginBottom: 18 }}>
        Para ligar (no terminal, na pasta <code>deploy</code>):<br />
        <code style={{ fontSize: 12 }}>docker compose --profile tools up -d n8n metabase nocodb</code><br />
        Para desligar: <code style={{ fontSize: 12 }}>docker compose --profile tools down</code>
      </div>
      <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {TOOLS.map((t) => (
          <div key={t.key} className="card" style={{ padding: 18, textAlign: "left", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <span style={{ fontSize: 26 }}>{t.icon}</span>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: "8px 0" }}>{t.tagline}</p>
            <button className="link" onClick={() => setOpen(open === t.key ? null : t.key)}>
              {open === t.key ? "Ocultar detalhes" : "Como usar / treinar"}
            </button>
            {open === t.key && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginTop: 6 }}>Como a empresa usa</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {t.uses.map((u, i) => <li key={i} style={{ marginBottom: 3 }}>{u}</li>)}
                </ul>
                <div style={{ fontWeight: 600, marginTop: 10 }}>Roteiro de treinamento</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "none" }}>
                  {t.training.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}
                </ul>
              </div>
            )}
            <a href={t.url} target="_blank" rel="noopener noreferrer"
              style={{ marginTop: 12, background: "#6d28d9", color: "#fff", padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Abrir ↗
            </a>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Academia Comenta (Fase 6): cursos/treinamentos com vídeo ----

// Converte um link de vídeo em URL embutível (YouTube/Vimeo) ou detecta MP4.
function embedInfo(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: "video", src: url };
  return { type: "link", src: url };
}

const doneKey = (id) => `comenta_lesson_done_${id}`;
const isDone = (id) => localStorage.getItem(doneKey(id)) === "1";

const LEVEL_LABEL = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };

// Formulário admin para criar um curso.
function CourseForm({ onCreate }) {
  const [f, setF] = useState({ title: "", emoji: "🎓", level: "iniciante", description: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (!f.title.trim()) return setErr("Dê um título ao curso.");
    setBusy(true);
    try { await onCreate({ ...f, title: f.title.trim() }); setF({ title: "", emoji: "🎓", level: "iniciante", description: "" }); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <form className="card" style={{ padding: 16, marginBottom: 16, maxWidth: 620, textAlign: "left", alignItems: "stretch" }} onSubmit={submit}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Novo curso</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="field" style={{ width: 70 }}><label>Emoji</label>
          <input value={f.emoji} onChange={set("emoji")} maxLength={4} style={{ textAlign: "center" }} /></div>
        <div className="field" style={{ flex: 1 }}><label>Título</label>
          <input value={f.title} onChange={set("title")} placeholder="Ex.: Atendimento nota 10" /></div>
        <div className="field" style={{ width: 150 }}><label>Nível</label>
          <select value={f.level} onChange={set("level")} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }}>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select></div>
      </div>
      <div className="field"><label>Descrição</label>
        <textarea value={f.description} onChange={set("description")} rows={2}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd", resize: "vertical" }} /></div>
      {err && <div className="err">{err}</div>}
      <button disabled={busy} style={{ marginTop: 6, alignSelf: "flex-start" }}>{busy ? "Salvando…" : "➕ Criar curso"}</button>
    </form>
  );
}

// Formulário admin para adicionar uma aula a um curso.
function LessonForm({ onCreate }) {
  const [f, setF] = useState({ title: "", videoUrl: "", content: "", durationMin: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    setBusy(true);
    try {
      await onCreate({ title: f.title.trim(), videoUrl: f.videoUrl.trim(), content: f.content.trim(), durationMin: Number(f.durationMin) || 0 });
      setF({ title: "", videoUrl: "", content: "", durationMin: "" });
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} style={{ marginTop: 12, borderTop: "1px dashed #d0d5dd", paddingTop: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Adicionar aula</div>
      <div className="field"><input value={f.title} onChange={set("title")} placeholder="Título da aula" /></div>
      <div className="field"><input value={f.videoUrl} onChange={set("videoUrl")} placeholder="Link do vídeo (YouTube, Vimeo ou .mp4) — opcional" /></div>
      <div className="field"><textarea value={f.content} onChange={set("content")} rows={2} placeholder="Conteúdo / resumo da aula"
        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd", resize: "vertical" }} /></div>
      <button disabled={busy} className="link">{busy ? "…" : "＋ Adicionar aula"}</button>
    </form>
  );
}

function CourseView({ courseId, isAdmin, onBack }) {
  const [course, setCourse] = useState(null);
  const [sel, setSel] = useState(null);
  const [, force] = useState(0);
  const load = () => api.course(courseId).then((c) => { setCourse(c); setSel((s) => s ?? (c.lessons[0]?.id || null)); }).catch(() => {});
  useEffect(() => { load(); }, [courseId]);
  if (!course) return <p className="muted">Carregando…</p>;

  const lesson = course.lessons.find((l) => l.id === sel) || null;
  const done = course.lessons.filter((l) => isDone(l.id)).length;
  const total = course.lessons.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const toggleDone = (id) => { localStorage.setItem(doneKey(id), isDone(id) ? "0" : "1"); force((x) => x + 1); };

  const addLesson = async (body) => { await api.lessonCreate(courseId, body); await load(); };
  const delLesson = async (id) => { if (confirm("Remover esta aula?")) { await api.lessonDelete(id); setSel(null); await load(); } };

  const emb = lesson ? embedInfo(lesson.videoUrl) : null;

  return (
    <>
      <button className="link" onClick={onBack}>← Voltar aos cursos</button>
      <h2 style={{ marginTop: 6 }}>{course.emoji} {course.title}</h2>
      <p className="muted" style={{ marginTop: -8, maxWidth: 680 }}>{course.description}</p>
      <div style={{ maxWidth: 680, marginBottom: 16 }}>
        <div style={{ height: 8, background: "#eef0f4", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "#6d28d9" }} />
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{done}/{total} aulas concluídas · {pct}%</div>
      </div>
      <div className="convgrid">
        <div className="list">
          {course.lessons.length === 0 && <div className="item muted">Sem aulas ainda</div>}
          {course.lessons.map((l, i) => (
            <div key={l.id} className={`item ${sel === l.id ? "active" : ""}`} onClick={() => setSel(l.id)}>
              <div className="name">{isDone(l.id) ? "✅ " : `${i + 1}. `}{l.title}</div>
              <div className="last">{l.durationMin ? `${l.durationMin} min` : "aula"}</div>
            </div>
          ))}
          {isAdmin && <LessonForm onCreate={addLesson} />}
        </div>
        <div className="thread">
          {!lesson && <p className="muted">Selecione uma aula</p>}
          {lesson && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{lesson.title}</span>
                {isAdmin && <button className="link" style={{ marginLeft: "auto", color: "#dc2626" }} onClick={() => delLesson(lesson.id)}>Remover aula</button>}
              </div>
              {emb && emb.type === "iframe" && (
                <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
                  <iframe src={emb.src} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
                </div>
              )}
              {emb && emb.type === "video" && (
                <video src={emb.src} controls style={{ width: "100%", borderRadius: 12, background: "#000" }} />
              )}
              {emb && emb.type === "link" && (
                <a href={emb.src} target="_blank" rel="noopener noreferrer" className="aibox" style={{ display: "block" }}>▶ Abrir vídeo em nova aba</a>
              )}
              {lesson.content && <p style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{lesson.content}</p>}
              <div style={{ marginTop: 14 }}>
                <button onClick={() => toggleDone(lesson.id)}
                  style={{ background: isDone(lesson.id) ? "#e2e8f0" : "#22c55e", color: isDone(lesson.id) ? "#334155" : "#fff", border: 0, padding: "8px 14px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
                  {isDone(lesson.id) ? "✓ Concluída — desmarcar" : "Marcar como concluída"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Academy({ isAdmin }) {
  const [list, setList] = useState(null);
  const [openId, setOpenId] = useState(null);
  const load = () => api.courses().then((r) => setList(r.data || [])).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const create = async (body) => { await api.courseCreate(body); await load(); };
  const remove = async (c) => { if (confirm(`Remover o curso "${c.title}"?`)) { await api.courseDelete(c.id); await load(); } };

  if (openId) return <CourseView courseId={openId} isAdmin={isAdmin} onBack={() => { setOpenId(null); load(); }} />;

  return (
    <>
      <h2>Academia</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Cursos e treinamentos para a equipe dominar o Comenta e as ferramentas. Assista às aulas,
        marque como concluídas e acompanhe seu progresso.
      </p>
      {isAdmin && <CourseForm onCreate={create} />}
      {list === null && <p className="muted">Carregando…</p>}
      {list && list.length === 0 && <p className="muted">Nenhum curso ainda{isAdmin ? " — crie o primeiro acima." : "."}</p>}
      <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {list && list.map((c) => (
          <div key={c.id} className="card" style={{ padding: 18, textAlign: "left", alignItems: "flex-start" }}>
            <div style={{ fontSize: 30 }}>{c.emoji}</div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>{c.title}</div>
            <span className="tag" style={{ margin: "6px 0" }}>{LEVEL_LABEL[c.level] || c.level}</span>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>{c.description}</p>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{c.lessonCount} aula{c.lessonCount === 1 ? "" : "s"}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, width: "100%" }}>
              <button onClick={() => setOpenId(c.id)}
                style={{ background: "#6d28d9", color: "#fff", border: 0, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {c.lessonCount ? "Assistir" : "Abrir"}
              </button>
              {isAdmin && <button className="link" style={{ color: "#dc2626" }} onClick={() => remove(c)}>Remover</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Filas / Departamentos (Fase 8) ----
const QUEUE_COLORS = ["#6d28d9", "#2563eb", "#16a34a", "#d97706", "#db2777", "#0891b2", "#dc2626", "#4b5563"];

function QueueCard({ q, users, onChanged }) {
  const [members, setMembers] = useState(q.memberIds || []);
  const [busy, setBusy] = useState(false);
  const toggle = (uid) => setMembers((cur) => (cur.includes(uid) ? cur.filter((x) => x !== uid) : [...cur, uid]));
  const save = async () => { setBusy(true); try { await api.queueSetMembers(q.id, members); onChanged?.(); } catch (e) { alert(e.message); } finally { setBusy(false); } };
  const setColor = async (color) => { await api.queueUpdate(q.id, { color }); onChanged?.(); };
  const remove = async () => { if (confirm(`Remover a fila "${q.name}"?`)) { await api.queueDelete(q.id); onChanged?.(); } };
  const dirty = JSON.stringify([...members].sort()) !== JSON.stringify([...(q.memberIds || [])].sort());

  return (
    <div className="card" style={{ padding: 18, textAlign: "left", alignItems: "stretch", maxWidth: 360 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 14, height: 14, borderRadius: 4, background: q.color }} />
        <div style={{ fontWeight: 700, flex: 1 }}>{q.name}</div>
        <button className="link" style={{ color: "#dc2626" }} onClick={remove}>Remover</button>
      </div>
      <div style={{ display: "flex", gap: 6, margin: "10px 0", flexWrap: "wrap" }}>
        {QUEUE_COLORS.map((c) => (
          <span key={c} onClick={() => setColor(c)} title="cor da fila"
            style={{ width: 18, height: 18, borderRadius: 4, background: c, cursor: "pointer", outline: q.color === c ? "2px solid #111" : "none" }} />
        ))}
      </div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Atendentes na fila:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
        {users.filter((u) => u.role !== "admin" || members.includes(u.id)).map((u) => (
          <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={members.includes(u.id)} onChange={() => toggle(u.id)} />
            {u.name}
          </label>
        ))}
        {users.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Sem atendentes cadastrados.</span>}
      </div>
      {dirty && <button disabled={busy} style={{ marginTop: 10, alignSelf: "flex-start" }} onClick={save}>{busy ? "Salvando…" : "Salvar membros"}</button>}
    </div>
  );
}

function Queues() {
  const [list, setList] = useState(null);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api.queues().then((r) => setList(r.data || [])).catch(() => setList([]));
  useEffect(() => { load(); api.users().then((r) => setUsers(r.data || r || [])).catch(() => {}); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try { await api.queueCreate({ name: name.trim(), color: QUEUE_COLORS[(list?.length || 0) % QUEUE_COLORS.length] }); setName(""); await load(); }
    catch (e) { alert(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <h2>Filas</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Departamentos de atendimento (Suporte, Vendas…). Cada conversa pode ser transferida para uma fila,
        e cada fila tem seus atendentes. Filtre as conversas por fila na aba Conversas.
      </p>
      <form onSubmit={create} className="card" style={{ padding: 14, marginBottom: 18, maxWidth: 460, flexDirection: "row", display: "flex", gap: 8, alignItems: "center" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova fila (ex.: Cobrança)"
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }} />
        <button disabled={busy}>{busy ? "…" : "➕ Criar fila"}</button>
      </form>
      {list === null && <p className="muted">Carregando…</p>}
      {list && list.length === 0 && <p className="muted">Nenhuma fila ainda — crie a primeira acima.</p>}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {list && list.map((q) => <QueueCard key={q.id} q={q} users={users} onChanged={load} />)}
      </div>
    </>
  );
}

// ---- Kanban de conversas (arrastar por etapa) ----
const KANBAN_COLS = [
  { key: "pending", label: "Aguardando", color: "#d97706" },
  { key: "open", label: "Em atendimento", color: "#2563eb" },
  { key: "resolved", label: "Resolvido", color: "#16a34a" },
];

function Kanban() {
  const [cols, setCols] = useState({ pending: [], open: [], resolved: [] });
  const [queues, setQueues] = useState([]);
  const [drag, setDrag] = useState(null); // { id, from }

  const load = async () => {
    const next = { pending: [], open: [], resolved: [] };
    await Promise.all(
      KANBAN_COLS.map(async (c) => {
        const r = await api.conversations({ status: c.key }).catch(() => ({ data: [] }));
        next[c.key] = r.data || [];
      })
    );
    setCols(next);
  };
  useEffect(() => { load(); api.queues().then((r) => setQueues(r.data || [])).catch(() => {}); }, []);
  const queueOf = (id) => queues.find((q) => q.id === id);

  const onDrop = async (toStatus) => {
    if (!drag || drag.from === toStatus) { setDrag(null); return; }
    // move otimista
    setCols((cur) => {
      const card = cur[drag.from].find((c) => c.id === drag.id);
      if (!card) return cur;
      return {
        ...cur,
        [drag.from]: cur[drag.from].filter((c) => c.id !== drag.id),
        [toStatus]: [{ ...card, status: toStatus }, ...cur[toStatus]],
      };
    });
    const id = drag.id;
    setDrag(null);
    try { await api.conversationUpdate(id, { status: toStatus }); } catch { load(); }
  };

  return (
    <>
      <h2>Kanban</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Arraste as conversas entre as etapas. Mover um card muda o status da conversa.
      </p>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", overflowX: "auto", paddingBottom: 8 }}>
        {KANBAN_COLS.map((col) => (
          <div key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.key)}
            style={{ flex: "1 0 260px", minWidth: 260, background: "#f8fafc", borderRadius: 12, padding: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontWeight: 700 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: col.color }} />
              {col.label}
              <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>{cols[col.key].length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
              {cols[col.key].length === 0 && <div className="muted" style={{ fontSize: 12, padding: 8 }}>Vazio</div>}
              {cols[col.key].map((c) => {
                const q = queueOf(c.queueId);
                return (
                  <div key={c.id} draggable
                    onDragStart={() => setDrag({ id: c.id, from: col.key })}
                    className="card" style={{ padding: 12, textAlign: "left", alignItems: "stretch", cursor: "grab", boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.contact?.name || "Contato"}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{c.contact?.phone || ""}</div>
                    {q && <span className="tag" style={{ background: q.color, color: "#fff", fontSize: 10, marginTop: 6, alignSelf: "flex-start" }}>{q.name}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Respostas rápidas (gestão) ----
function QuickReplies() {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ shortcut: "", message: "" });
  const load = () => api.quickReplies().then((r) => setList(r.data || [])).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    if (!f.shortcut.trim() || !f.message.trim()) return;
    let sc = f.shortcut.trim(); if (!sc.startsWith("/")) sc = "/" + sc;
    try { await api.quickReplyCreate({ shortcut: sc, message: f.message.trim() }); setF({ shortcut: "", message: "" }); load(); }
    catch (e) { alert(e.message); }
  };
  const del = async (id) => { if (confirm("Remover esta resposta rápida?")) { await api.quickReplyDelete(id); load(); } };
  return (
    <>
      <h2>Respostas rápidas</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Atalhos de mensagem que o atendente insere na conversa com um clique (botão ⚡ no chat).
      </p>
      <form onSubmit={create} className="card" style={{ padding: 16, marginBottom: 18, maxWidth: 620, alignItems: "stretch" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={f.shortcut} onChange={(e) => setF({ ...f, shortcut: e.target.value })} placeholder="/atalho"
            style={{ width: 140, padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }} />
          <input value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Texto da mensagem"
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }} />
          <button>➕ Criar</button>
        </div>
      </form>
      {list === null && <p className="muted">Carregando…</p>}
      {list && list.length === 0 && <p className="muted">Nenhuma resposta rápida ainda.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 680 }}>
        {list && list.map((qr) => (
          <div key={qr.id} className="card" style={{ padding: 12, flexDirection: "row", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="tag" style={{ background: "#eef2ff", color: "#4338ca" }}>{qr.shortcut}</span>
            <span style={{ flex: 1, fontSize: 14 }}>{qr.message}</span>
            <button className="link" style={{ color: "#dc2626" }} onClick={() => del(qr.id)}>Remover</button>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Tags (gestão) ----
function TagsManager() {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ name: "", color: "#6d28d9" });
  const load = () => api.tags().then((r) => setList(r.data || [])).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    try { await api.tagCreate({ name: f.name.trim(), color: f.color }); setF({ name: "", color: "#6d28d9" }); load(); }
    catch (e) { alert(e.message); }
  };
  const del = async (id) => { if (confirm("Remover esta tag?")) { await api.tagDelete(id); load(); } };
  return (
    <>
      <h2>Tags</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Etiquetas coloridas para classificar conversas (aplicadas no cabeçalho de cada conversa).
      </p>
      <form onSubmit={create} className="card" style={{ padding: 16, marginBottom: 18, maxWidth: 460, flexDirection: "row", display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} style={{ width: 40, height: 38, border: "none", background: "none" }} />
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nome da tag"
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }} />
        <button>➕ Criar</button>
      </form>
      {list === null && <p className="muted">Carregando…</p>}
      {list && list.length === 0 && <p className="muted">Nenhuma tag ainda.</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {list && list.map((t) => (
          <div key={t.id} className="card" style={{ padding: "8px 12px", flexDirection: "row", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="tag" style={{ background: t.color, color: "#fff" }}>{t.name}</span>
            <button className="link" style={{ color: "#dc2626", fontSize: 12 }} onClick={() => del(t.id)}>×</button>
          </div>
        ))}
      </div>
    </>
  );
}

export function App() {
  const [logged, setLogged] = useState(isLoggedIn());
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("dashboard");

  useEffect(() => { if (logged) api.me().then(setMe).catch(() => { api.logout(); setLogged(false); }); }, [logged]);

  if (!logged) return <Login onLogin={() => setLogged(true)} />;

  return (
    <div className="app">
      <aside className="side">
        <Logo />
        <nav className="nav">
          <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>📊 Dashboard</button>
          <button className={tab === "conversas" ? "active" : ""} onClick={() => setTab("conversas")}>💬 Conversas</button>
          <button className={tab === "kanban" ? "active" : ""} onClick={() => setTab("kanban")}>📋 Kanban</button>
          {me?.principal?.role === "admin" && <button className={tab === "filas" ? "active" : ""} onClick={() => setTab("filas")}>🗂️ Filas</button>}
          <button className={tab === "respostas" ? "active" : ""} onClick={() => setTab("respostas")}>⚡ Respostas</button>
          {me?.principal?.role === "admin" && <button className={tab === "tags" ? "active" : ""} onClick={() => setTab("tags")}>🏷️ Tags</button>}
          <button className={tab === "automacoes" ? "active" : ""} onClick={() => setTab("automacoes")}>🤖 Automações</button>
          <button className={tab === "ferramentas" ? "active" : ""} onClick={() => setTab("ferramentas")}>🧩 Ferramentas</button>
          <button className={tab === "cursos" ? "active" : ""} onClick={() => setTab("cursos")}>🎓 Academia</button>
          <button className={tab === "conexoes" ? "active" : ""} onClick={() => setTab("conexoes")}>📲 Conexões</button>
        </nav>
        <div style={{ position: "absolute", bottom: 18, fontSize: 13 }} className="muted">
          {me?.company?.name}<br />
          <button className="link" onClick={() => { api.logout(); setLogged(false); }}>Sair</button>
        </div>
      </aside>
      <main className="main">
        {tab === "dashboard" && <Dashboard />}
        {tab === "conversas" && <Conversations />}
        {tab === "kanban" && <Kanban />}
        {tab === "filas" && <Queues />}
        {tab === "respostas" && <QuickReplies />}
        {tab === "tags" && <TagsManager />}
        {tab === "automacoes" && <Automations />}
        {tab === "ferramentas" && <Tools />}
        {tab === "cursos" && <Academy isAdmin={me?.principal?.role === "admin"} />}
        {tab === "conexoes" && <Connections isAdmin={me?.principal?.role === "admin"} />}
      </main>
    </div>
  );
}
