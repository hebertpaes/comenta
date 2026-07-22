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

function Connections() {
  const [st, setSt] = useState({ status: "disconnected", qr: null, phone: null });
  const [busy, setBusy] = useState(false);

  const refresh = () => api.waStatus().then(setSt).catch(() => {});
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000); // polling do estado
    return () => clearInterval(t);
  }, []);

  const connect = async () => {
    setBusy(true);
    try { setSt(await api.waConnect()); } catch (e) { alert(e.message); } finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true);
    try { setSt(await api.waDisconnect()); } catch (e) { alert(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <h2>Conexões</h2>
      <div className="card" style={{ maxWidth: 460, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 26 }}>🟢</span>
          <div>
            <div style={{ fontWeight: 700 }}>WhatsApp Business</div>
            <div className="muted" style={{ fontSize: 13 }}>Conecte seu número via QR Code</div>
          </div>
        </div>

        {st.status === "connected" && (
          <div className="aibox" style={{ borderColor: "#22c55e" }}>
            ✅ <b>Conectado</b>{st.phone ? ` — ${st.phone}` : ""}
            <div style={{ marginTop: 12 }}>
              <button disabled={busy} onClick={disconnect}>Desconectar</button>
            </div>
          </div>
        )}

        {st.status === "connecting" && st.qr && (
          <div style={{ textAlign: "center" }}>
            <img src={st.qr} alt="QR do WhatsApp" width={260} height={260}
              style={{ borderRadius: 12, background: "#fff", padding: 8 }} />
            <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
              Abra o WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> e aponte para o QR.
            </p>
            <p className="muted" style={{ fontSize: 12 }}>Aguardando leitura…</p>
          </div>
        )}

        {st.status === "connecting" && !st.qr && (
          <div className="aibox">
            ⏳ Gerando QR Code… aguarde alguns segundos.
            <div style={{ marginTop: 12 }}>
              <button disabled={busy} onClick={disconnect}>Cancelar</button>
            </div>
          </div>
        )}

        {st.status === "disconnected" && (
          <div>
            <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>
              Nenhum número conectado. Gere o QR para parear seu WhatsApp Business.
            </p>
            <button disabled={busy} onClick={connect}>{busy ? "Gerando…" : "📲 Conectar WhatsApp"}</button>
          </div>
        )}

        {st.demo && (
          <p className="muted" style={{ fontSize: 11, marginTop: 16, opacity: 0.8 }}>
            Modo demonstração: o pareamento é simulado para testes. Integração real via Baileys já tem o ponto de encaixe no back-end.
          </p>
        )}
      </div>
    </>
  );
}

function Conversations() {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [draft, setDraft] = useState("");

  const load = () => api.conversations().then((r) => setList(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { if (sel) api.conversation(sel).then(setDetail).catch(() => {}); }, [sel]);

  const send = async () => {
    if (!draft.trim() || !sel) return;
    await api.sendMessage(sel, draft.trim());
    setDraft("");
    api.conversation(sel).then(setDetail);
  };

  return (
    <>
      <h2>Conversas</h2>
      <div className="convgrid">
        <div className="list">
          {list.length === 0 && <div className="item muted">Nenhuma conversa</div>}
          {list.map((c) => (
            <div key={c.id} className={`item ${sel === c.id ? "active" : ""}`} onClick={() => setSel(c.id)}>
              <div className="name">{c.contact?.name || "Contato"}</div>
              <div className="last">{c.status} · {c.contact?.phone || ""}</div>
            </div>
          ))}
        </div>
        <div className="thread">
          {!detail && <p className="muted">Selecione uma conversa</p>}
          {detail && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{detail.contact?.name}</span>
                {detail.contact?.phone && (
                  <>
                    <span className="muted" style={{ fontSize: 13 }}>📱 {detail.contact.phone}</span>
                    <a
                      href={`https://wa.me/${detail.contact.phone.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ marginLeft: "auto", background: "#22c55e", color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                    >💬 WhatsApp</a>
                  </>
                )}
              </div>
              <AiPanel conversationId={detail.id} />
              <div className="msgs">
                {(detail.messages || []).map((msg) => (
                  <div key={msg.id} className={`bubble ${msg.direction}`}>{msg.body}</div>
                ))}
              </div>
              <div className="composer">
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
          <button className={tab === "automacoes" ? "active" : ""} onClick={() => setTab("automacoes")}>🤖 Automações</button>
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
        {tab === "automacoes" && <Automations />}
        {tab === "conexoes" && <Connections />}
      </main>
    </div>
  );
}
