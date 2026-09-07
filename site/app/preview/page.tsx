"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Sparkles,
  Zap,
  Users,
  BarChart3,
  Bot,
  Settings,
  Send,
  PhoneCall,
  CheckCheck,
  Search,
  Plus,
  Play,
  Volume2,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Flame,
  DollarSign,
  Layers
} from "lucide-react";

export type Message = {
  id: string;
  sender: "user" | "ai" | "system";
  text: string;
  time: string;
  leadTag?: string;
  hasAudio?: boolean;
  audioDuration?: string;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  status: "novo" | "qualificado" | "proposta" | "fechado";
  interest: string;
  intentScore: number;
  value: number;
  timeAgo: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "system",
    text: "🔒 Atendimento criptografado iniciado com Sofia AI — Atendente Virtual Comenta AI v2.0",
    time: "14:30"
  },
  {
    id: "m2",
    sender: "ai",
    text: "Olá! Seja muito bem-vindo ao atendimento da Comenta AI ✦. Sou a Sofia, especialista em automação e vendas no WhatsApp. Como posso impulsionar seu negócio hoje?",
    time: "14:30",
    hasAudio: true,
    audioDuration: "0:08"
  }
];

const INITIAL_LEADS: Lead[] = [
  {
    id: "l1",
    name: "Dr. Gabriel Santos",
    phone: "+55 (65) 99842-1020",
    status: "qualificado",
    interest: "Plano Anual Enterprise + 5 Conexões",
    intentScore: 98,
    value: 4188,
    timeAgo: "Há 3 min"
  },
  {
    id: "l2",
    name: "Mariana Oliveira",
    phone: "+55 (11) 98765-4321",
    status: "proposta",
    interest: "Curso de Atendimento Automatizado",
    intentScore: 85,
    value: 1290,
    timeAgo: "Há 12 min"
  },
  {
    id: "l3",
    name: "Lucas Alencar",
    phone: "+55 (31) 99112-8877",
    status: "fechado",
    interest: "Comenta SaaS Pro",
    intentScore: 100,
    value: 3588,
    timeAgo: "Há 25 min"
  },
  {
    id: "l4",
    name: "Dra. Camila Rocha",
    phone: "+55 (41) 98822-3344",
    status: "novo",
    interest: "Integração Clínica Médica",
    intentScore: 72,
    value: 2400,
    timeAgo: "Há 40 min"
  }
];

export default function ComentaAIPortalPage() {
  const [activeTab, setActiveTab] = useState<"simulator" | "studio" | "crm" | "analytics">("simulator");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Agent Studio Customization
  const [agentName, setAgentName] = useState("Sofia 2.0");
  const [agentTone, setAgentTone] = useState("Consultiva, Ágil e Persuasiva");
  const [agentPrompt, setAgentPrompt] = useState(
    "Você é a Sofia, atendente de IA de alto desempenho da Comenta. Seu objetivo é qualificar leads no WhatsApp em até 3 perguntas, apresentar os planos Pro/Enterprise e encaminhar propostas."
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const newMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setIsTyping(true);

    // AI Intelligence Auto-Response Generator
    setTimeout(() => {
      let aiReply = "Perfeito! Entendi seu interesse. Nossa IA pode qualificar e responder 24/7 com tempo médio de resposta de apenas 1,2 segundo.";
      let tag = "🔥 Qualificação Automática";
      let audio = false;

      if (textToSend.toLowerCase().includes("preço") || textToSend.toLowerCase().includes("plano") || textToSend.toLowerCase().includes("valor")) {
        aiReply = "O Comenta AI oferece o Plano Pro (R$ 299/mês) e o Plano Enterprise com IA Generativa ilimitada e 5 conexões de WhatsApp por R$ 349/mês. Gostaria de garantir 7 dias grátis?";
        tag = "💰 Lead de Alta Intenção (98%)";
        audio = true;
      } else if (textToSend.toLowerCase().includes("suporte") || textToSend.toLowerCase().includes("humano") || textToSend.toLowerCase().includes("atendente")) {
        aiReply = "Entendido! Realizando o transbordo inteligente para o especialista humano em menos de 10 segundos. O histórico completo da conversa foi enviado ao CRM.";
        tag = "🤝 Transbordo para Humano";
      } else if (textToSend.toLowerCase().includes("curso") || textToSend.toLowerCase().includes("treinamento")) {
        aiReply = "Excelente! O Curso de Automação de Atendimento do Comenta inclui 24 módulos práticos e certificados para treinar sua equipe.";
        tag = "🎓 Interesse em Cursos";
      }

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: aiReply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        leadTag: tag,
        hasAudio: audio,
        audioDuration: audio ? "0:12" : undefined
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);

      // Dynamically add a qualified lead to CRM
      if (textToSend.length > 5) {
        const newLead: Lead = {
          id: `lead_${Date.now()}`,
          name: "Novo Cliente WhatsApp",
          phone: "+55 (65) 99911-2233",
          status: "qualificado",
          interest: textToSend,
          intentScore: 94,
          value: 3588,
          timeAgo: "Agora"
        };
        setLeads((prev) => [newLead, ...prev]);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc] flex flex-col font-sans antialiased selection:bg-[#0050ff] selection:text-white">
      {/* 1. TOP BAR NAVBAR */}
      <header className="h-16 border-b border-[#1e293b] bg-[#0b0f19]/90 backdrop-blur sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0050ff] via-[#7c3aed] to-[#06b6d4] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[#0050ff]/20">
            ✦
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#cbd5e1] to-[#94a3b8]">
              Comenta AI <span className="text-xs px-2 py-0.5 rounded-full bg-[#0050ff]/20 text-[#38bdf8] font-bold border border-[#0050ff]/40">v2.0</span>
            </span>
            <p className="text-[11px] text-[#64748b]">Portal SaaS de Atendimento & Automação de WhatsApp</p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <nav className="flex items-center gap-1 bg-[#141a29] p-1.5 rounded-2xl border border-[#1e293b]">
          <button
            onClick={() => setActiveTab("simulator")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "simulator"
                ? "bg-[#0050ff] text-white shadow-md shadow-[#0050ff]/30"
                : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Simulador WhatsApp
          </button>

          <button
            onClick={() => setActiveTab("studio")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "studio"
                ? "bg-[#0050ff] text-white shadow-md shadow-[#0050ff]/30"
                : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
            }`}
          >
            <Bot className="w-4 h-4" /> Agent Studio
          </button>

          <button
            onClick={() => setActiveTab("crm")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "crm"
                ? "bg-[#0050ff] text-white shadow-md shadow-[#0050ff]/30"
                : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
            }`}
          >
            <Layers className="w-4 h-4" /> Kanban CRM
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "analytics"
                ? "bg-[#0050ff] text-white shadow-md shadow-[#0050ff]/30"
                : "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Métricas & BI
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://hojemt.com.br"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-[#1e293b] text-white hover:bg-[#334155] text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            Ver Portal Hoje MT <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 gap-6">
        {/* ========================================================================= */}
        {/* TAB 1: WHATSAPP SIMULATOR */}
        {/* ========================================================================= */}
        {activeTab === "simulator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT CONTROL PANEL */}
            <div className="lg:col-span-4 space-y-5">
              {/* STATUS CARD */}
              <div className="bg-[#141a29] border border-[#1e293b] rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#38bdf8] flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping" /> WhatsApp Conectado
                  </span>
                  <span className="text-xs font-mono text-[#94a3b8]">127.0.0.1:2368</span>
                </div>

                <div className="flex items-center gap-4 bg-[#0b0f19] p-4 rounded-2xl border border-[#1e293b]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#10b981] to-[#059669] text-white flex items-center justify-center text-xl font-black flex-none shadow-md">
                    S
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{agentName}</h3>
                    <p className="text-xs text-[#94a3b8]">Agente Virtual Ativo • Modelo Gemini 2.0</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-[#0b0f19] p-3 rounded-xl border border-[#1e293b]">
                    <span className="text-lg font-black text-[#10b981]">1,2s</span>
                    <p className="text-[10px] text-[#64748b]">Tempo Médio Resposta</p>
                  </div>
                  <div className="bg-[#0b0f19] p-3 rounded-xl border border-[#1e293b]">
                    <span className="text-lg font-black text-[#38bdf8]">98,4%</span>
                    <p className="text-[10px] text-[#64748b]">Resolução pela IA</p>
                  </div>
                </div>
              </div>

              {/* QUICK PROMPT TRIGGERS */}
              <div className="bg-[#141a29] border border-[#1e293b] rounded-3xl p-6 space-y-3 shadow-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">⚡ Testar Gatilhos Rápidos</h4>
                
                <button
                  onClick={() => handleSendMessage("Qual o preço dos planos do Comenta AI?")}
                  className="w-full text-left p-3 rounded-2xl bg-[#0b0f19] hover:bg-[#1e293b] border border-[#1e293b] hover:border-[#0050ff] transition-all text-xs font-medium text-[#e2e8f0] flex items-center justify-between group"
                >
                  <span>💰 Perguntar Preço dos Planos</span>
                  <ChevronRight className="w-4 h-4 text-[#64748b] group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => handleSendMessage("Quero falar com um atendente humano")}
                  className="w-full text-left p-3 rounded-2xl bg-[#0b0f19] hover:bg-[#1e293b] border border-[#1e293b] hover:border-[#0050ff] transition-all text-xs font-medium text-[#e2e8f0] flex items-center justify-between group"
                >
                  <span>🤝 Solicitar Transbordo Humano</span>
                  <ChevronRight className="w-4 h-4 text-[#64748b] group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => handleSendMessage("Como funciona o curso de atendimento por IA?")}
                  className="w-full text-left p-3 rounded-2xl bg-[#0b0f19] hover:bg-[#1e293b] border border-[#1e293b] hover:border-[#0050ff] transition-all text-xs font-medium text-[#e2e8f0] flex items-center justify-between group"
                >
                  <span>🎓 Consultar Cursos e Treinamentos</span>
                  <ChevronRight className="w-4 h-4 text-[#64748b] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* RIGHT MOCKUP: REALISTIC WHATSAPP CHAT */}
            <div className="lg:col-span-8">
              <div className="bg-[#0d141e] border border-[#1e293b] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px] relative">
                {/* WHATSAPP CHAT HEADER */}
                <div className="bg-[#1f2c34] px-6 py-3 border-b border-[#2a3942] flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-lg shadow">
                      S
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        {agentName} <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full font-extrabold border border-[#00a884]/40">VERIFICADO</span>
                      </h4>
                      <p className="text-[11px] text-[#8696a0]">online • Comenta AI WhatsApp Engine</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[#8696a0]">
                    <Search className="w-4 h-4 hover:text-white cursor-pointer" />
                    <PhoneCall className="w-4 h-4 hover:text-white cursor-pointer" />
                  </div>
                </div>

                {/* WHATSAPP CHAT MESSAGES BODY */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px] bg-[#0b141a] scrollbar-thin">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === "user"
                          ? "items-end"
                          : msg.sender === "ai"
                          ? "items-start"
                          : "items-center"
                      }`}
                    >
                      {msg.sender === "system" ? (
                        <div className="bg-[#182229] border border-[#2a3942] text-[#8696a0] text-[11px] px-4 py-1.5 rounded-full my-2 text-center max-w-md">
                          {msg.text}
                        </div>
                      ) : (
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-2 shadow-md relative ${
                            msg.sender === "user"
                              ? "bg-[#005c4b] text-white rounded-tr-none"
                              : "bg-[#202c33] text-[#e9edef] rounded-tl-none border border-[#2a3942]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>

                          {/* AUDIO PLAYER SIMULATION */}
                          {msg.hasAudio && (
                            <div className="mt-2 bg-[#111b21] p-2.5 rounded-xl flex items-center gap-3 border border-[#2a3942]">
                              <button
                                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                                className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center flex-none hover:scale-105 transition-transform"
                              >
                                <Play className="w-4 h-4 fill-white ml-0.5" />
                              </button>
                              <div className="flex-1">
                                <div className="h-1.5 bg-[#2a3942] rounded-full overflow-hidden">
                                  <div className={`h-full bg-[#00a884] ${isPlayingAudio ? "w-3/4 animate-pulse" : "w-1/4"}`} />
                                </div>
                                <span className="text-[10px] text-[#8696a0] mt-1 block">Áudio da Sofia ({msg.audioDuration})</span>
                              </div>
                            </div>
                          )}

                          {/* LEAD QUALIFICATION TAG */}
                          {msg.leadTag && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0050ff]/20 text-[#38bdf8] border border-[#0050ff]/40 text-[10px] font-bold">
                              <Sparkles className="w-3 h-3" /> {msg.leadTag}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] mt-1">
                            <span>{msg.time}</span>
                            {msg.sender === "user" && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* IS TYPING INDICATOR */}
                  {isTyping && (
                    <div className="flex items-center gap-2 bg-[#202c33] text-[#8696a0] px-4 py-2 rounded-2xl rounded-tl-none w-fit text-xs border border-[#2a3942]">
                      <span className="font-semibold text-[#00a884]">{agentName}</span>
                      <span>está digitando...</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:0.4s]" />
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* WHATSAPP INPUT BAR */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="bg-[#202c33] p-3 border-t border-[#2a3942] flex items-center gap-3 z-10"
                >
                  <input
                    type="text"
                    placeholder="Digite uma mensagem ou comando..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-[#2a3942] text-white text-xs sm:text-sm px-4 py-3 rounded-xl focus:outline-none placeholder-[#8696a0]"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="w-11 h-11 rounded-xl bg-[#00a884] hover:bg-[#008f70] text-white flex items-center justify-center flex-none transition-colors disabled:opacity-40"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: AGENT STUDIO */}
        {/* ========================================================================= */}
        {activeTab === "studio" && (
          <div className="bg-[#141a29] border border-[#1e293b] rounded-3xl p-8 space-y-6 shadow-2xl">
            <div>
              <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                <Bot className="w-6 h-6 text-[#0050ff]" /> Agent Studio — Personalização da IA
              </h2>
              <p className="text-sm text-[#94a3b8] mt-1">Configure o comportamento, o tom de voz e as regras de transbordo da sua atendente virtual.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-[#94a3b8] mb-2">Nome do Agente Virtual</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0050ff]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-[#94a3b8] mb-2">Tom de Voz & Estilo</label>
                  <input
                    type="text"
                    value={agentTone}
                    onChange={(e) => setAgentTone(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0050ff]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-[#94a3b8] mb-2">Prompt do Sistema (Instruções Principais)</label>
                  <textarea
                    rows={5}
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#0050ff] leading-relaxed"
                  />
                </div>
              </div>

              <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-6 space-y-4">
                <h4 className="text-xs font-extrabold uppercase text-[#38bdf8] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Regras Globais de Segurança & Qualificação
                </h4>
                
                <div className="space-y-3 text-xs text-[#cbd5e1]">
                  <label className="flex items-center gap-3 p-3 bg-[#141a29] rounded-xl border border-[#1e293b] cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-[#0050ff]" />
                    <span>Qualificar lead antes de encaminhar proposta</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-[#141a29] rounded-xl border border-[#1e293b] cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-[#0050ff]" />
                    <span>Enviar resumo da conversa para a equipe no WhatsApp</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-[#141a29] rounded-xl border border-[#1e293b] cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-[#0050ff]" />
                    <span>Respeitar o horário comercial e enviar mensagem de ausência</span>
                  </label>
                </div>

                <button
                  onClick={() => alert("Configurações do Agente salvas com sucesso!")}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0050ff] to-[#7c3aed] text-white font-extrabold text-sm shadow-lg hover:opacity-90 transition-opacity"
                >
                  Salvar Configurações no Comenta AI
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: KANBAN CRM */}
        {/* ========================================================================= */}
        {activeTab === "crm" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-6 h-6 text-[#10b981]" /> Funil de Vendas & CRM Inteligente
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">Leads qualificados automaticamente pela IA Sofia no WhatsApp.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: "Novos Leads", status: "novo", color: "border-sky-500/50 bg-sky-500/10 text-sky-400" },
                { title: "Qualificados pela IA", status: "qualificado", color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" },
                { title: "Proposta Enviada", status: "proposta", color: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
                { title: "Venda Concluída", status: "fechado", color: "border-amber-500/50 bg-amber-500/10 text-amber-400" }
              ].map((col) => (
                <div key={col.status} className="bg-[#141a29] border border-[#1e293b] rounded-2xl p-4 space-y-3 min-h-[450px]">
                  <div className={`p-2.5 rounded-xl border font-extrabold text-xs flex items-center justify-between ${col.color}`}>
                    <span>{col.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px]">
                      {leads.filter((l) => l.status === col.status).length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {leads
                      .filter((l) => l.status === col.status)
                      .map((lead) => (
                        <div key={lead.id} className="bg-[#0b0f19] border border-[#1e293b] hover:border-[#0050ff] p-4 rounded-xl space-y-2 transition-all shadow-md">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-white">{lead.name}</h4>
                            <span className="text-[10px] font-bold text-[#10b981] flex items-center gap-1">
                              <Flame className="w-3 h-3 fill-[#10b981]" /> {lead.intentScore}%
                            </span>
                          </div>
                          <p className="text-xs text-[#94a3b8] line-clamp-2">{lead.interest}</p>
                          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#1e293b] text-[#64748b]">
                            <span className="font-mono text-[#38bdf8] font-bold">R$ {lead.value.toLocaleString("pt-BR")}</span>
                            <span>{lead.timeAgo}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-[#141a29] border border-[#1e293b] p-6 rounded-3xl space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-[#64748b]">
                  <span className="text-xs font-bold uppercase">Atendimentos Hoje</span>
                  <MessageSquare className="w-5 h-5 text-[#0050ff]" />
                </div>
                <span className="text-3xl font-black text-white">1.482</span>
                <p className="text-[11px] text-[#10b981] font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +28% vs dia anterior
                </p>
              </div>

              <div className="bg-[#141a29] border border-[#1e293b] p-6 rounded-3xl space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-[#64748b]">
                  <span className="text-xs font-bold uppercase">Taxa de Resolução IA</span>
                  <Bot className="w-5 h-5 text-[#10b981]" />
                </div>
                <span className="text-3xl font-black text-white">91,4%</span>
                <p className="text-[11px] text-[#38bdf8]">Sem necessidade de atendente humano</p>
              </div>

              <div className="bg-[#141a29] border border-[#1e293b] p-6 rounded-3xl space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-[#64748b]">
                  <span className="text-xs font-bold uppercase">Tempo Médio de Resposta</span>
                  <Clock className="w-5 h-5 text-[#7c3aed]" />
                </div>
                <span className="text-3xl font-black text-white">1,1s</span>
                <p className="text-[11px] text-[#10b981] font-bold">Imediato no WhatsApp</p>
              </div>

              <div className="bg-[#141a29] border border-[#1e293b] p-6 rounded-3xl space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-[#64748b]">
                  <span className="text-xs font-bold uppercase">Receita Gerada pela IA</span>
                  <DollarSign className="w-5 h-5 text-[#f59e0b]" />
                </div>
                <span className="text-3xl font-black text-white">R$ 48.950</span>
                <p className="text-[11px] text-[#10b981] font-bold">42 vendas este mês</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
