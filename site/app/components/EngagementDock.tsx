"use client";

// EngagementDock — consentimento (LGPD) + DUAS filas de atendimento.
//  1. 1ª visita: banner de cookies/termos. Ao ACEITAR, o assistente abre
//     sozinho e pergunta: falar com a IA ou com um humano?
//  2. FILA DA IA (✨): atendida na hora pela IA, que resolve dúvidas comuns.
//  3. FILA HUMANA: escolhe o time (Suporte/Vendas/Financeiro/Marketing) e a
//     conversa é TRANSFERIDA para dentro do sistema — vira um atendimento real
//     no painel, e a resposta do atendente aparece AQUI no próprio chat do site
//     (nada de sair para o WhatsApp).

import React, { useCallback, useEffect, useRef, useState } from "react";

type Consent = "unknown" | "accepted" | "declined";
type Phase = "inicio" | "fila" | "contato" | "agent";
type Modo = "ia" | "humano" | null;
type From = "bot" | "user" | "agent" | "system";
type Fila = { id: string; nome: string; emoji: string; online: number };
type Msg = { id: number; from: From; text: string; author?: string; cta?: { label: string; href: string } };

const STORAGE_KEY = "comenta_consent";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.comenta.com.br";

const FILAS_HUMANAS: Fila[] = [
  { id: "Suporte", nome: "Suporte", emoji: "🛟", online: 2 },
  { id: "Vendas", nome: "Vendas", emoji: "💼", online: 2 },
  { id: "Financeiro", nome: "Financeiro", emoji: "💳", online: 1 },
  { id: "Marketing", nome: "Marketing", emoji: "📣", online: 2 },
];
const TOTAL_HUMANOS = FILAS_HUMANAS.reduce((n, f) => n + f.online, 0);

// Fluxo de RESOLUÇÃO (self-service): tópicos que a IA tenta resolver sozinha.
// Cada um mapeia para o time humano usado só se o visitante disser que NÃO
// resolveu. Funciona sem chave de IA (respostas guiadas).
type Topico = { key: string; label: string; team: string; steps: string };
const RESOLUCOES: Topico[] = [
  { key: "planos", label: "Dúvida sobre planos 💳", team: "Vendas", steps: "Temos 3 planos: Free (R$0, sem cartão), Pro (R$99/mês — todos os canais + IA completa) e Business (R$299/mês — multi-tenant, API, SLA). Dá pra começar no Free e migrar quando quiser." },
  { key: "tecnico", label: "Suporte técnico 🛠️", team: "Suporte", steps: "Para a maioria dos casos: 1) atualize a página; 2) confira sua conexão; 3) saia e entre de novo no painel. Se for em um canal (ex.: WhatsApp), reconecte-o em Conexões." },
  { key: "financeiro", label: "Financeiro / pagamento 💰", team: "Financeiro", steps: "Faturas, 2ª via, troca de cartão e upgrade/downgrade ficam no painel em Configurações › Cobrança." },
  { key: "comecar", label: "Quero começar 🚀", team: "Vendas", steps: "É rápido: crie sua conta no painel (sem cartão), conecte um canal e já comece a atender com a IA sugerindo as respostas." },
];

let _id = 1;
const nid = () => _id++;

function botAnswer(key: string): Msg {
  switch (key) {
    case "planos":
      return { id: nid(), from: "agent", author: "Assistente IA", text: "Temos 3 planos: Free (R$0), Pro (R$99/mês) e Business (R$299/mês).", cta: { label: "Ver planos", href: "#planos" } };
    case "ia":
      return { id: nid(), from: "agent", author: "Assistente IA", text: "Eu (Claude) classifico, resumo e sugiro a resposta — você só revisa e envia. 👇", cta: { label: "Ver a IA em ação", href: "#ia" } };
    case "comecar":
      return { id: nid(), from: "agent", author: "Assistente IA", text: "É só criar sua conta no painel — sem cartão de crédito. 🚀", cta: { label: "Criar conta grátis", href: APP_URL } };
    default:
      return { id: nid(), from: "agent", author: "Assistente IA", text: "Posso ajudar com planos, como a IA funciona ou te transferir para um humano. O que prefere?" };
  }
}

// ---- chamadas ao widget público da API ----
async function waStart(team: string, name: string, phone: string): Promise<{ conversationId: string; token: string } | null> {
  try {
    const r = await fetch(`${API_URL}/widget/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "Visitante do site", team, phone }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function waSend(conversationId: string, token: string, body: string) {
  try {
    await fetch(`${API_URL}/widget/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, token, body }),
    });
  } catch {}
}
async function waPoll(conversationId: string, token: string, after: string | null) {
  try {
    const qs = new URLSearchParams({ conversationId, token, ...(after ? { after } : {}) });
    const r = await fetch(`${API_URL}/widget/messages?${qs.toString()}`);
    if (!r.ok) return [];
    return (await r.json()).data as Array<{ id: string; direction: string; body: string; createdAt: string; author: string | null }>;
  } catch { return []; }
}

export default function EngagementDock() {
  const [consent, setConsent] = useState<Consent>("unknown");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState<false | { author: string }>(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  const [phase, setPhase] = useState<Phase>("inicio");
  const [modo, setModo] = useState<Modo>(null);
  const [fila, setFila] = useState<Fila | null>(null);
  const [agent, setAgent] = useState<string | null>(null);
  const [resolveTeam, setResolveTeam] = useState<string | null>(null); // aguardando "resolveu? sim/não"

  // coleta de contato antes da fila humana (WhatsApp obrigatório)
  const [pendingTeam, setPendingTeam] = useState<Fila | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadErr, setLeadErr] = useState("");

  // conversa real (fila humana)
  const [conv, setConv] = useState<{ conversationId: string; token: string } | null>(null);
  const lastTsRef = useRef<string | null>(null);
  const agentJoinedRef = useRef(false);

  const greeted = useRef(false);
  const timers = useRef<number[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; };
  const later = (fn: () => void, ms: number) => { const t = window.setTimeout(fn, ms); timers.current.push(t); };

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as Consent | null;
      if (v === "accepted" || v === "declined") setConsent(v);
    } catch {}
    setReady(true);
    return clearTimers;
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing, open, phase]);

  const addMsg = (m: Msg) => setMessages((prev) => [...prev, m]);
  const say = useCallback((m: Msg, delay = 700, author?: string) => {
    setTyping({ author: author ?? m.author ?? "Assistente" });
    later(() => { setTyping(false); addMsg(m); }, delay);
  }, []);

  // ---- polling das respostas do atendente (fila humana) ----
  useEffect(() => {
    if (!conv) return;
    let alive = true;
    const tick = async () => {
      const msgs = await waPoll(conv.conversationId, conv.token, lastTsRef.current);
      if (!alive) return;
      for (const sm of msgs) {
        lastTsRef.current = sm.createdAt;
        if (sm.direction === "out") {
          const nome = sm.author || "Atendente";
          if (!agentJoinedRef.current) {
            agentJoinedRef.current = true;
            setAgent(nome);
            addMsg({ id: nid(), from: "system", text: `${nome} assumiu o seu atendimento.` });
          }
          addMsg({ id: nid(), from: "agent", author: nome, text: sm.body });
        }
      }
    };
    tick();
    const iv = window.setInterval(tick, 3000);
    return () => { alive = false; clearInterval(iv); };
  }, [conv]);

  const persist = (v: Consent) => {
    try {
      localStorage.setItem(STORAGE_KEY, v);
      document.cookie = `${STORAGE_KEY}=${v}; max-age=31536000; path=/; SameSite=Lax`;
    } catch {}
  };

  const startConversation = useCallback(() => {
    if (greeted.current) return;
    greeted.current = true;
    setOpen(true);
    setPhase("inicio");
    say({ id: nid(), from: "bot", text: "Olá! 👋 Sou o assistente do Comenta. Você quer falar com a IA ou com um humano?" }, 600);
  }, [say]);

  const accept = () => { persist("accepted"); setConsent("accepted"); later(startConversation, 800); };
  const decline = () => { persist("declined"); setConsent("declined"); };

  // ---- FILA IA + FLUXO DE RESOLUÇÃO (self-service) ----
  const falarComIA = () => {
    clearTimers();
    setModo("ia"); setFila(null); setAgent("Assistente IA"); setPhase("agent"); setResolveTeam(null);
    addMsg({ id: nid(), from: "system", text: "Você entrou na fila de Atendimento IA ✨." });
    say({ id: nid(), from: "agent", author: "Assistente IA", text: "Oi! Sou o Assistente IA ✨. Vou tentar resolver aqui mesmo. Sobre o que é? Escolha um tópico ou escreva sua dúvida." }, 800, "Assistente IA");
  };

  // Tenta resolver o tópico e, depois, pergunta se resolveu.
  const resolver = (t: Topico) => {
    setResolveTeam(null);
    addMsg({ id: nid(), from: "user", text: t.label });
    say({ id: nid(), from: "agent", author: "Assistente IA", text: t.steps }, 800, "Assistente IA");
    later(() => { addMsg({ id: nid(), from: "system", text: "Isso resolveu sua dúvida?" }); setResolveTeam(t.team); }, 1600);
  };
  const marcarResolvido = () => {
    setResolveTeam(null);
    addMsg({ id: nid(), from: "system", text: "Perfeito, atendimento resolvido ✅" });
    say({ id: nid(), from: "agent", author: "Assistente IA", text: "Que bom que ajudei! 🎉 Precisa de mais alguma coisa?" }, 700, "Assistente IA");
  };
  const naoResolvido = () => {
    const team = resolveTeam || "Suporte";
    setResolveTeam(null);
    const f = FILAS_HUMANAS.find((x) => x.id === team) || FILAS_HUMANAS[0];
    say({ id: nid(), from: "agent", author: "Assistente IA", text: `Sem problema — vou te transferir para o time de ${f.nome}. 👇` }, 600, "Assistente IA");
    later(() => pedirContato(f), 1200);
  };

  const pedirFilaHumana = () => {
    setPhase("fila");
    say({ id: nid(), from: "bot", text: `Certo! Temos ${TOTAL_HUMANOS} atendentes humanos online. Com qual time você quer falar?` }, 500);
  };

  // ---- FILA HUMANA: 1) coleta o WhatsApp (obrigatório), 2) abre a conversa ----
  const pedirContato = (f: Fila) => {
    clearTimers();
    setFila(f); setPendingTeam(f); setLeadErr(""); setPhase("contato");
  };
  const iniciarAtendimento = async () => {
    const f = pendingTeam;
    if (!f) return;
    const digits = leadPhone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      setLeadErr("Informe um WhatsApp válido com DDD (ex.: 66 99999-8888).");
      return;
    }
    setLeadErr("");
    setModo("humano"); setAgent(null); setPhase("agent");
    agentJoinedRef.current = false; lastTsRef.current = null;
    addMsg({ id: nid(), from: "system", text: `Transferindo para o time de ${f.nome} ${f.emoji}…` });
    const c = await waStart(f.id, leadName, digits);
    if (!c) {
      addMsg({ id: nid(), from: "system", text: "Não consegui abrir o atendimento agora. Confira o número e tente de novo." });
      setPhase("contato");
      return;
    }
    setConv(c);
    addMsg({ id: nid(), from: "system", text: `Recebemos seu WhatsApp (${digits}). Você entrou na fila de ${f.nome}; um atendente responde aqui e pode te chamar no WhatsApp. 💬` });
  };

  const encerrar = () => {
    clearTimers();
    setConv(null); agentJoinedRef.current = false; lastTsRef.current = null;
    setPendingTeam(null); setLeadPhone(""); setLeadName(""); setLeadErr("");
    addMsg({ id: nid(), from: "system", text: "Atendimento encerrado ✅ Obrigado pelo contato!" });
    setPhase("inicio"); setModo(null); setFila(null); setAgent(null);
    say({ id: nid(), from: "bot", text: "Precisa de mais alguma coisa? Quer falar com a IA ou com um humano?" }, 700);
  };

  const respIA = (t: string) => {
    const l = t.toLowerCase();
    if (/plano|preç|preco|valor/.test(l)) say(botAnswer("planos"), 700);
    else if (/\bia\b|intelig|claude|autom/.test(l)) say(botAnswer("ia"), 700);
    else if (/começ|comec|cadastr|conta|grátis|gratis/.test(l)) say(botAnswer("comecar"), 700);
    else say({ id: nid(), from: "agent", author: "Assistente IA", text: "Consigo te ajudar com isso ou posso te transferir para um atendente humano. Quer falar com o time?" }, 700);
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    addMsg({ id: nid(), from: "user", text: t });
    setInput("");
    if (modo === "humano" && conv) {
      waSend(conv.conversationId, conv.token, t); // vai para o painel; resposta volta pelo polling
    } else {
      respIA(t);
    }
  };

  if (!ready) return null;

  const headerTitle =
    phase === "agent" && modo === "humano" && agent ? agent :
    phase === "agent" && modo === "humano" ? "Aguardando atendente" :
    phase === "agent" && modo === "ia" ? "Assistente IA" :
    "Assistente Comenta";
  const headerSub =
    phase === "agent" && modo === "ia" ? "Atendimento IA" :
    phase === "agent" && modo === "humano" && agent ? `Atendente · ${fila?.nome ?? ""}` :
    phase === "agent" && modo === "humano" ? `Na fila de ${fila?.nome ?? ""}…` :
    `IA + ${TOTAL_HUMANOS} humanos online`;

  return (
    <>
      {/* ===== Banner LGPD ===== */}
      {consent === "unknown" && (
        <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:p-5">
            <div className="text-2xl">🍪</div>
            <p className="flex-1 text-sm text-slate-600">
              Usamos cookies para melhorar sua experiência, analisar o tráfego e
              personalizar conteúdo. Ao aceitar, você concorda com nossa{" "}
              <a href="#" className="font-medium text-fuchsia-600 underline">Política de Privacidade</a>{" "}
              e os <a href="#" className="font-medium text-fuchsia-600 underline">Termos de Uso</a>.
            </p>
            <div className="flex flex-none gap-2">
              <button onClick={decline} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Recusar</button>
              <button onClick={accept} className="rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:opacity-90">Aceitar e continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Chat ===== */}
      {consent !== "unknown" && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
          {open && (
            <div className="flex h-[32rem] w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center gap-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-3 text-white">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
                  {phase === "agent" && modo === "humano" && agent ? agent[0] : "✨"}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-bold leading-tight">{headerTitle}</div>
                  <div className="flex items-center gap-1 text-xs text-fuchsia-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" /> {headerSub}
                  </div>
                </div>
                {phase === "agent" && (
                  <button onClick={encerrar} className="rounded-full bg-white/15 px-2 py-1 text-xs font-semibold hover:bg-white/25">Encerrar</button>
                )}
                <button onClick={() => setOpen(false)} aria-label="Fechar chat" className="rounded-full p-1 text-white/90 hover:bg-white/10">✕</button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {messages.map((m) => {
                  if (m.from === "system") {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-center text-[11px] font-medium text-slate-600">{m.text}</span>
                      </div>
                    );
                  }
                  const mine = m.from === "user";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${mine ? "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
                        {m.from === "agent" && m.author && (<div className="mb-0.5 text-[11px] font-bold text-fuchsia-600">{m.author}</div>)}
                        {m.text}
                        {m.cta && (<a href={m.cta.href} className="mt-2 block rounded-lg bg-slate-900 px-3 py-1.5 text-center text-xs font-semibold text-white hover:opacity-90">{m.cta.label}</a>)}
                      </div>
                    </div>
                  );
                })}

                {/* seleção de time (fila humana) */}
                {phase === "fila" && !typing && (
                  <div className="flex flex-col gap-2">
                    {FILAS_HUMANAS.map((f) => (
                      <button key={f.id} onClick={() => pedirContato(f)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-fuchsia-300 hover:bg-fuchsia-50">
                        <span className="text-lg">{f.emoji}</span> {f.nome}
                        <span className="ml-auto text-xs text-slate-400">{f.online} online</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* coleta de contato — WhatsApp obrigatório antes de entrar na fila */}
                {phase === "contato" && pendingTeam && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); iniciarAtendimento(); }}
                    className="rounded-2xl border border-fuchsia-200 bg-white p-4"
                  >
                    <div className="text-sm font-semibold text-slate-800">Falar com {pendingTeam.nome} {pendingTeam.emoji}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Informe seu WhatsApp para o atendente falar com você.</div>
                    <input
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Seu nome (opcional)"
                      className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fuchsia-400 focus:outline-none"
                    />
                    <input
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      inputMode="tel"
                      placeholder="WhatsApp com DDD (ex.: 66 99999-8888)"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fuchsia-400 focus:outline-none"
                      required
                    />
                    {leadErr && <div className="mt-1 text-xs font-medium text-red-500">{leadErr}</div>}
                    <button type="submit" className="mt-3 w-full rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                      Iniciar atendimento
                    </button>
                  </form>
                )}

                {/* aguardando atendente entrar (fila humana) */}
                {phase === "agent" && modo === "humano" && !agent && (
                  <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-center">
                    <div className="text-sm font-semibold text-fuchsia-700">Na fila de {fila?.nome}</div>
                    <div className="mt-1 text-xs text-slate-600">Um atendente vai assumir aqui neste chat. Pode já escrever sua dúvida. 💬</div>
                  </div>
                )}

                {typing && (
                  <div className="flex">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400">{typing.author} digitando…</div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* ações rápidas por fase */}
              <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 pt-3">
                {phase === "inicio" && (
                  <>
                    <button onClick={falarComIA} className="qr border-indigo-300 text-indigo-700">Falar com a IA ✨</button>
                    <button onClick={pedirFilaHumana} className="qr border-fuchsia-300 text-fuchsia-700">Falar com um humano 🧑‍💼</button>
                  </>
                )}
                {phase === "agent" && modo === "ia" && !resolveTeam && (
                  <>
                    {RESOLUCOES.map((t) => (
                      <button key={t.key} onClick={() => resolver(t)} className="qr">{t.label}</button>
                    ))}
                    <button onClick={pedirFilaHumana} className="qr border-fuchsia-300 text-fuchsia-700">Falar com um humano 🧑‍💼</button>
                    <button onClick={encerrar} className="qr">Encerrar</button>
                  </>
                )}
                {phase === "agent" && modo === "ia" && resolveTeam && (
                  <>
                    <button onClick={marcarResolvido} className="qr border-emerald-300 text-emerald-700">✅ Sim, resolveu</button>
                    <button onClick={naoResolvido} className="qr border-fuchsia-300 text-fuchsia-700">❌ Não, falar com humano</button>
                  </>
                )}
                {phase === "agent" && modo === "humano" && (
                  <button onClick={encerrar} className="qr">Encerrar atendimento</button>
                )}
                {(phase === "fila" || phase === "contato") && (<button onClick={encerrar} className="qr">Cancelar</button>)}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 bg-white p-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={phase === "agent" && modo === "humano" ? "Fale com o atendente…" : "Escreva uma mensagem…"}
                  className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-fuchsia-400 focus:outline-none"
                />
                <button type="submit" aria-label="Enviar" className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white">➤</button>
              </form>
            </div>
          )}

          <button
            onClick={() => { setOpen((o) => !o); if (!greeted.current) startConversation(); }}
            aria-label={open ? "Fechar chat" : "Abrir chat"}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-2xl text-white shadow-xl shadow-fuchsia-500/30 transition hover:scale-105"
          >
            {open ? "✕" : "💬"}
          </button>
        </div>
      )}

      <style jsx>{`
        .qr {
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: #475569;
          transition: all 0.15s;
        }
        .qr:hover { border-color: #f0abfc; color: #a21caf; }
      `}</style>
    </>
  );
}
