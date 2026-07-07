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
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{detail.contact?.name}</div>
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
        </nav>
        <div style={{ position: "absolute", bottom: 18, fontSize: 13 }} className="muted">
          {me?.company?.name}<br />
          <button className="link" onClick={() => { api.logout(); setLogged(false); }}>Sair</button>
        </div>
      </aside>
      <main className="main">
        {tab === "dashboard" ? <Dashboard /> : <Conversations />}
      </main>
    </div>
  );
}
