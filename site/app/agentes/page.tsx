"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Send,
  Users,
  Briefcase,
  BarChart3,
  Play,
  Download,
  Copy,
  Check,
  Zap,
  Wand2,
  RefreshCw,
  ArrowRight,
  Plus,
  Paperclip,
  Mic,
  ChevronDown,
  Menu,
  X,
  MessageSquare,
  Compass,
  History,
  HelpCircle,
  ExternalLink
} from "lucide-react";

export type Agent = {
  id: string;
  nome: string;
  papel: string;
  categoria: "clientes" | "colaboradores" | "multimidia";
  avatar: string;
  cor: string;
  modelo: string;
  descricao: string;
  capacidades: string[];
  promptInicial: string;
  sugestoes: string[];
};

const AGENTES: Agent[] = [
  {
    id: "agente-vendas",
    nome: "Sofia — Vendas & Comercial",
    papel: "Atendimento & Qualificação de Leads",
    categoria: "clientes",
    avatar: "✦",
    cor: "from-[#4285f4] via-[#9b72cb] to-[#d96570]",
    modelo: "Comenta AI Flash",
    descricao: "Qualifica clientes, envia propostas comerciais e tira dúvidas de planos no WhatsApp.",
    capacidades: ["Qualificação de Leads", "Envio de Preços", "Contorno de Objeções", "Agendamento"],
    promptInicial: "Olá, Hebert. Sou a Sofia, sua especialista comercial de IA do Comenta. Como posso impulsionar suas vendas hoje?",
    sugestoes: [
      "Como qualificar um cliente interessado no Plano Pro?",
      "Escreva um script de vendas de WhatsApp para clínica médica",
      "Qual o retorno sobre investimento (ROI) do AtendeChat?"
    ]
  },
  {
    id: "agente-imagens",
    nome: "Pixel — Gerador de Mídia & Banners IA",
    papel: "Criação de Banners, Posts & Imagens HD",
    categoria: "multimidia",
    avatar: "🎨",
    cor: "from-[#ff7700] via-[#ff0055] to-[#9900ff]",
    modelo: "Comenta Imagen Studio",
    descricao: "Gera ilustrações profissionais, banners para WhatsApp e artes publicitárias em alta resolução.",
    capacidades: ["Banners 1:1 e 9:16", "Fotos de Produtos com Fundo", "Artes de Promoção", "HD Download"],
    promptInicial: "Olá! Digite a imagem que deseja gerar (ex: 'Banner de promoção do WhatsApp para loja de roupas').",
    sugestoes: [
      "Criar banner de promoção de 50% OFF para WhatsApp",
      "Gerar foto de estúdio de um smartphone futurista",
      "Criar ilustração no estilo 3D para anúncio de IA"
    ]
  },
  {
    id: "agente-videos",
    nome: "Cine — Gerador de Vídeos & Roteiros",
    papel: "Roteiros & Animações MP4 para Reels/TikTok",
    categoria: "multimidia",
    avatar: "🎬",
    cor: "from-[#a855f7] via-[#ec4899] to-[#ef4444]",
    modelo: "Comenta Veo Studio",
    descricao: "Cria roteiros virais e renderiza animações e vídeos curtos prontos para publicação.",
    capacidades: ["Roteiros de 15s e 30s", "Animações MP4", "Edição WASM", "Legendas & Call to Action"],
    promptInicial: "Olá! Qual produto ou serviço vamos transformar em vídeo animado para Reels/TikTok hoje?",
    sugestoes: [
      "Gerar vídeo de 15 segundos apresentando o AtendeChat",
      "Criar roteiro viral para TikTok sobre atendimento automatizado",
      "Gerar animação promocional de lançamento de produto"
    ]
  },
  {
    id: "agente-rh-suporte",
    nome: "Bruno — Onboarding & Suporte Interno",
    papel: "Atendimento a Colaboradores & Manuais",
    categoria: "colaboradores",
    avatar: "💼",
    cor: "from-[#10b981] via-[#06b6d4] to-[#3b82f6]",
    modelo: "Comenta Pro Engine",
    descricao: "Auxilia sua equipe com manuais de trabalho, políticas internas e procedimentos operacionais.",
    capacidades: ["Manual do Colaborador", "Procedimentos Operacionais", "Dúvidas de HR", "Boas-vindas"],
    promptInicial: "Olá! Sou o Bruno do Suporte Interno. Em que posso ajudar você ou sua equipe hoje?",
    sugestoes: [
      "Quais os horários de atendimento padrão da equipe?",
      "Como realizar o transbordo de atendimento para o financeiro?",
      "Passo a passo para cadastrar uma resposta rápida"
    ]
  },
  {
    id: "agente-analista-bi",
    nome: "Atlas — Analista de Métricas & BI",
    papel: "Relatórios de Vendas & Performance",
    categoria: "colaboradores",
    avatar: "📊",
    cor: "from-[#3b82f6] via-[#6366f1] to-[#8b5cf6]",
    modelo: "Comenta Analytics",
    descricao: "Sintetiza estatísticas de atendimento, tempo de resposta e volume de vendas em resumos executivos.",
    capacidades: ["Métricas de Atendimento", "Análise de Churn", "Relatórios de Desempenho", "Insights de Crescimento"],
    promptInicial: "Olá! Sou o Atlas, analista de dados. Digite 'gerar relatório' para ver os números da empresa.",
    sugestoes: [
      "Gerar relatório executivo de atendimento da semana",
      "Qual a média do Tempo Médio de Resposta (TME)?",
      "Análise de satisfação do cliente (NPS) por atendente"
    ]
  }
];

export default function FullscreenComentaAIPage() {
  const [sidebarAberta, setSidebarAberta] = useState<boolean>(true);
  const [agenteSelecionado, setAgenteSelecionado] = useState<Agent>(AGENTES[0]!);
  const [modeloAtivo, setModeloAtivo] = useState<string>("Comenta AI Flash");
  const [mensagens, setMensagens] = useState<Array<{ remetente: "user" | "agent"; texto: string; imagemUrl?: string; videoUrl?: string }>>([
    { remetente: "agent", texto: AGENTES[0]!.promptInicial }
  ]);
  const [inputTexto, setInputTexto] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(false);
  const [modoGeracao, setModoGeracao] = useState<"texto" | "imagem" | "video">("texto");
  const [treinandoIA, setTreinandoIA] = useState<boolean>(false);
  const [mensagemStatusTreino, setMensagemStatusTreino] = useState<string | null>(null);

  const executarTreinamentoDiario = () => {
    setTreinandoIA(true);
    setMensagemStatusTreino("🔄 Sincronizando atendimentos diários com o Comenta AI...");

    setTimeout(() => {
      setTreinandoIA(false);
      setMensagemStatusTreino("✦ Treinamento Diário Concluído! Agentes do Comenta AI atualizados com dados mais recentes.");
      setTimeout(() => setMensagemStatusTreino(null), 5000);
    }, 1500);
  };

  const trocarAgente = (agente: Agent) => {
    setAgenteSelecionado(agente);
    setModeloAtivo(agente.modelo);
    setMensagens([{ remetente: "agent", texto: agente.promptInicial }]);
    if (agente.id === "agente-imagens") setModoGeracao("imagem");
    else if (agente.id === "agente-videos") setModoGeracao("video");
    else setModoGeracao("texto");
  };

  const enviarMensagem = (promptTexto?: string) => {
    const textoParaEnviar = promptTexto || inputTexto;
    if (!textoParaEnviar.trim()) return;

    setInputTexto("");
    setMensagens((prev) => [...prev, { remetente: "user", texto: textoParaEnviar }]);
    setCarregando(true);

    setTimeout(() => {
      let respostaTexto = `Compreendido! Processando via **${modeloAtivo}**:\n\n"${textoParaEnviar}"`;
      let img: string | undefined = undefined;
      let vid: string | undefined = undefined;

      if (agenteSelecionado.id === "agente-imagens" || modoGeracao === "imagem") {
        respostaTexto = `✨ **Imagem gerada com sucesso via Comenta Imagen**\nPrompt: *"${textoParaEnviar}"*`;
        img = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
      } else if (agenteSelecionado.id === "agente-videos" || modoGeracao === "video") {
        respostaTexto = `🎬 **Vídeo animado MP4 gerado com sucesso via Comenta Veo**\n\n• **Roteiro**: "Transforme seu atendimento com o Comenta AI."\n• **Duração**: 15 segundos\n• **Resolução**: 1080p HD`;
        vid = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
      } else if (agenteSelecionado.id === "agente-vendas") {
        respostaTexto = `Com certeza! Aqui está a recomendação de abordagem comercial baseada no **${modeloAtivo}**:\n\n"Olá! Seja bem-vindo ao Comenta AtendeChat. Nosso Plano Pro inclui 3 conexões de WhatsApp + IA generativa por apenas R$ 349/mês. Gostaria de ativar sua avaliação gratuita de 7 dias?"`;
      } else if (agenteSelecionado.id === "agente-analista-bi") {
        respostaTexto = `📊 **Boletim Executivo de Inteligência de Dados**:\n\n• **Conversas Ativas**: 48 no total\n• **Tempo Médio de Atendimento**: 52 segundos\n• **NPS Geral**: 4.95 / 5.0 ⭐\n• **Respostas por IA**: 84% de resolução automática sem transbordo`;
      }

      setMensagens((prev) => [
        ...prev,
        { remetente: "agent", texto: respostaTexto, imagemUrl: img, videoUrl: vid }
      ]);
      setCarregando(false);
    }, 1000);
  };

  const novaConversa = () => {
    setMensagens([{ remetente: "agent", texto: agenteSelecionado.promptInicial }]);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#131314] text-[#e3e3e3] flex font-sans antialiased overflow-hidden select-none">
      {/* 1. Sidebar Retrátil Estilo Comenta */}
      <aside
        className={`bg-[#1e1f20] border-r border-[#2e2f31] flex flex-col justify-between transition-all duration-300 z-40 ${
          sidebarAberta ? "w-64" : "w-16"
        }`}
      >
        {/* Topo da Sidebar */}
        <div className="p-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setSidebarAberta(!sidebarAberta)}
              className="p-2 rounded-full hover:bg-[#2e2f31] text-[#c4c7c5] transition-colors"
              title="Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            {sidebarAberta && (
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span className="text-base bg-clip-text text-transparent bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570]">
                  ✦
                </span>
                Comenta AI
              </span>
            )}
          </div>

          {/* Botão Nova Conversa */}
          <button
            onClick={novaConversa}
            className={`w-full py-2.5 px-3 rounded-full bg-[#2e2f31] hover:bg-[#3c4043] text-xs font-semibold text-white transition-all flex items-center gap-3 border border-[#3c4043] shadow-sm ${
              !sidebarAberta && "justify-center px-0"
            }`}
          >
            <Plus className="w-4 h-4 text-[#a8c7fa]" />
            {sidebarAberta && <span>Nova conversa</span>}
          </button>

          {/* Lista de Agentes de IA */}
          <div className="pt-2 space-y-1">
            {sidebarAberta && (
              <div className="text-[10px] uppercase font-bold text-[#8e918f] px-2 mb-2 tracking-wider">
                Agentes Ativos
              </div>
            )}
            {AGENTES.map((a) => (
              <button
                key={a.id}
                onClick={() => trocarAgente(a)}
                className={`w-full p-2.5 rounded-2xl transition-all flex items-center gap-3 text-xs ${
                  agenteSelecionado.id === a.id
                    ? "bg-[#333538] text-white font-bold shadow-md"
                    : "text-[#c4c7c5] hover:bg-[#2e2f31]"
                } ${!sidebarAberta && "justify-center p-2"}`}
                title={a.nome}
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${a.cor} text-white flex items-center justify-center text-xs flex-none`}>
                  {a.avatar}
                </div>
                {sidebarAberta && <span className="truncate">{a.nome}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-[#2e2f31] text-xs space-y-2">
          {sidebarAberta ? (
            <div className="flex items-center justify-between text-[#8e918f] text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cuiabá, MT
              </span>
              <a href="/" className="hover:text-white flex items-center gap-1">
                Sair <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto" />
          )}
        </div>
      </aside>

      {/* 2. Área Principal Full-Screen */}
      <main className="flex-1 flex flex-col justify-between h-full bg-[#131314] relative overflow-hidden">
        {/* Top Header Transparente com Seletor de Modelo */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-[#2e2f31]/50 bg-[#131314]/80 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            <div className="relative inline-block">
              <select
                value={modeloAtivo}
                onChange={(e) => setModeloAtivo(e.target.value)}
                className="appearance-none bg-[#1e1f20] text-[#e3e3e3] text-xs font-semibold px-4 py-1.5 pr-8 rounded-full border border-[#2e2f31] focus:outline-none focus:ring-1 focus:ring-[#a8c7fa] cursor-pointer hover:bg-[#2e2f31] transition-colors"
              >
                <option value="Comenta AI Flash">Comenta AI Flash ✦</option>
                <option value="Comenta Pro Engine">Comenta Pro Engine ✦</option>
                <option value="Comenta Imagen Studio">Comenta Imagen Studio (Mídia HD)</option>
                <option value="Claude Sonnet 3.7">Claude Sonnet 3.7 (Anthropic)</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#8e918f] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={executarTreinamentoDiario}
              disabled={treinandoIA}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#4285f4]/20 via-[#9b72cb]/20 to-[#d96570]/20 text-[#a8c7fa] border border-[#a8c7fa]/30 hover:border-[#a8c7fa] font-semibold transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${treinandoIA ? "animate-spin text-white" : ""}`} />
              <span>{treinandoIA ? "Treinando IA..." : "Treinar IA Diariamente"}</span>
            </button>

            <a
              href="http://localhost:8080"
              target="_blank"
              className="px-3.5 py-1.5 rounded-full bg-[#2e2f31] text-white hover:bg-[#3c4043] font-semibold transition-colors flex items-center gap-1.5 text-xs"
            >
              Painel AtendeChat <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </header>

        {mensagemStatusTreino && (
          <div className="bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-300 z-30">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>{mensagemStatusTreino}</span>
          </div>
        )}

        {/* Canvas Central de Chat */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center justify-start space-y-6 max-w-4xl w-full mx-auto scrollbar-thin">
          {/* Boas-Vindas Minimalista quando poucas mensagens */}
          {mensagens.length <= 1 && (
            <div className="my-auto text-center space-y-8 w-full max-w-2xl py-12 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white flex items-center justify-center text-3xl font-extrabold mx-auto shadow-2xl animate-pulse">
                ✦
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570]">
                    Olá, Hebert.
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl text-[#8e918f] font-normal">
                  Como o Comenta AI pode ajudar com seus atendimentos hoje?
                </p>
              </div>

              {/* Suggestions Cards Minimalistas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                {agenteSelecionado.sugestoes.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => enviarMensagem(sug)}
                    className="p-4 rounded-2xl bg-[#1e1f20] border border-[#2e2f31] hover:border-[#444746] transition-all hover:-translate-y-0.5 group flex flex-col justify-between h-28"
                  >
                    <p className="text-xs text-[#c4c7c5] font-medium line-clamp-3 group-hover:text-white">
                      {sug}
                    </p>
                    <div className="text-[10px] text-[#4285f4] font-bold flex items-center justify-between pt-1">
                      <span>Executar no Comenta</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stream de Mensagens da Conversa */}
          {mensagens.length > 1 && (
            <div className="w-full space-y-6 py-4">
              {mensagens.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${msg.remetente === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.remetente === "agent" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white flex items-center justify-center font-bold text-xs flex-none shadow-md">
                      ✦
                    </div>
                  )}

                  <div
                    className={`max-w-2xl p-5 rounded-3xl text-xs sm:text-sm leading-relaxed space-y-3 ${
                      msg.remetente === "user"
                        ? "bg-[#2e2f31] text-white font-medium rounded-tr-none border border-[#3c4043]"
                        : "bg-[#1e1f20] text-[#e3e3e3] rounded-tl-none border border-[#2e2f31] shadow-xl"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.texto}</p>

                    {/* Imagem Gerada */}
                    {msg.imagemUrl && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-[#3c4043] bg-black">
                        <img src={msg.imagemUrl} alt="Imagem IA Gerada" className="w-full h-64 object-cover" />
                        <div className="p-3 bg-[#131314] text-white flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#a8c7fa] flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4" /> Comenta Imagen HD
                          </span>
                          <a
                            href={msg.imagemUrl}
                            target="_blank"
                            download
                            className="px-3 py-1.5 rounded-full bg-[#4285f4] text-white font-bold text-xs hover:bg-[#3367d6] flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> Baixar HD
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Vídeo Gerado */}
                    {msg.videoUrl && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-[#3c4043] bg-black">
                        <video src={msg.videoUrl} controls className="w-full h-64 bg-black" />
                        <div className="p-3 bg-[#131314] text-white flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#a8c7fa] flex items-center gap-1.5">
                            <Video className="w-4 h-4" /> Comenta Veo MP4
                          </span>
                          <a
                            href={msg.videoUrl}
                            target="_blank"
                            download
                            className="px-3 py-1.5 rounded-full bg-[#a855f7] text-white font-bold text-xs hover:bg-[#9333ea] flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> Baixar MP4
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {carregando && (
                <div className="flex gap-3 justify-start items-center p-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4285f4] to-[#d96570] text-white flex items-center justify-center text-xs animate-spin">
                    ✦
                  </div>
                  <span className="text-xs text-[#a8c7fa] animate-pulse font-medium">
                    O Comenta AI está processando...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Bottom Minimalist Floating Comenta Input Bar */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-6 pt-2 z-30">
          {/* Seletor de Modo (Texto, Imagem, Vídeo) */}
          <div className="flex items-center gap-2 mb-2 px-2">
            <button
              onClick={() => setModoGeracao("texto")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                modoGeracao === "texto" ? "bg-[#4285f4] text-white" : "bg-[#1e1f20] text-[#c4c7c5] hover:bg-[#2e2f31]"
              }`}
            >
              💬 Texto
            </button>
            <button
              onClick={() => setModoGeracao("imagem")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                modoGeracao === "imagem" ? "bg-[#ff7700] text-white" : "bg-[#1e1f20] text-[#c4c7c5] hover:bg-[#2e2f31]"
              }`}
            >
              🎨 Gerar Imagem HD
            </button>
            <button
              onClick={() => setModoGeracao("video")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                modoGeracao === "video" ? "bg-[#a855f7] text-white" : "bg-[#1e1f20] text-[#c4c7c5] hover:bg-[#2e2f31]"
              }`}
            >
              🎬 Gerar Vídeo MP4
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviarMensagem();
            }}
            className="relative bg-[#1e1f20] rounded-full border border-[#2e2f31] p-2 pl-5 flex items-center justify-between shadow-2xl focus-within:border-[#4285f4] transition-all"
          >
            <input
              type="text"
              placeholder={
                modoGeracao === "imagem"
                  ? "Descreva a imagem que deseja gerar..."
                  : modoGeracao === "video"
                  ? "Descreva a cena do vídeo MP4..."
                  : `Digite um comando para ${agenteSelecionado.nome}...`
              }
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              className="w-full bg-transparent text-white text-xs sm:text-sm focus:outline-none placeholder-[#8e918f] pr-12"
            />

            <button
              type="submit"
              disabled={!inputTexto.trim()}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white font-extrabold flex items-center justify-center text-sm shadow-lg hover:opacity-90 transition-opacity disabled:opacity-30 flex-none"
            >
              ✦
            </button>
          </form>

          <p className="text-[10px] text-center text-[#8e918f] mt-2">
            O Comenta AI utiliza inteligência generativa. Verifique informações importantes.
          </p>
        </div>
      </main>
    </div>
  );
}
