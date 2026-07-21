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
        {tab === "conexoes" && <Connections />}
      </main>
    </div>
  );
}
