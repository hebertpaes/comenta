import React, { useState } from "react";
import {
  Bot,
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
  RefreshCw
} from "lucide-react";

export type Agent = {
  id: string;
  nome: string;
  papel: string;
  categoria: "clientes" | "colaboradores" | "multimidia";
  avatar: string;
  cor: string;
  descricao: string;
  capacidades: string[];
  promptInicial: string;
};

const AGENTES: Agent[] = [
  {
    id: "agente-vendas",
    nome: "Sofia — Vendas & Comercial",
    papel: "Atendimento ao Cliente & Qualificação de Leads",
    categoria: "clientes",
    avatar: "🤖",
    cor: "from-fuchsia-600 to-pink-500",
    descricao: "Especialista em tirar dúvidas de preços, qualificar potenciais compradores e fechar propostas comerciais no WhatsApp.",
    capacidades: ["Qualificação de Leads", "Envio de Tabela de Preços", "Contorno de Objeções", "Agendamento de Demos"],
    promptInicial: "Olá! Sou a Sofia, especialista comercial da sua empresa. Como posso ajudar com seus clientes hoje?"
  },
  {
    id: "agente-imagens",
    nome: "Pixel — Gerador de Artes & Imagens IA",
    papel: "Criação de Banners, Posts & Imagens para Mídias",
    categoria: "multimidia",
    avatar: "🎨",
    cor: "from-amber-500 to-orange-600",
    descricao: "Gera ilustrações profissionais, banners para WhatsApp e artes publicitárias em segundos.",
    capacidades: ["Geração de Banners", "Fotos de Produtos com Fundo", "Ilustrações Promocionais", "Formatos 1:1 e 9:16"],
    promptInicial: "Olá! Digite a imagem que você deseja criar (ex: 'Banner de promoção do WhatsApp para loja de eletrônicos')."
  },
  {
    id: "agente-videos",
    nome: "Cine — Gerador de Vídeos & Roteiros",
    papel: "Roteiros para Reels/TikTok & Animações",
    categoria: "multimidia",
    avatar: "🎬",
    cor: "from-purple-600 to-indigo-600",
    descricao: "Cria roteiros virais para mídias sociais e gera vídeos curtos prontos para divulgação.",
    capacidades: ["Roteiros de 15s e 30s", "Animações Promocionais", "Edição Automática", "Legendas & Call to Action"],
    promptInicial: "Olá! Sobre qual produto ou serviço vamos criar um vídeo animado para Reels/TikTok hoje?"
  },
  {
    id: "agente-rh-suporte",
    nome: "Bruno — Onboarding & Suporte Interno",
    papel: "Atendimento a Colaboradores & Treinamentos",
    categoria: "colaboradores",
    avatar: "💼",
    cor: "from-emerald-500 to-teal-600",
    descricao: "Auxilia sua equipe tirando dúvidas sobre manuais de trabalho, políticas internas e primeiros passos na empresa.",
    capacidades: ["Manual do Colaborador", "Resolução de Dúvidas Internas", "Suporte a Procedimentos", "Boas-vindas ao Time"],
    promptInicial: "Olá! Sou o Bruno do Suporte Interno. Em que posso ajudar você ou sua equipe hoje?"
  },
  {
    id: "agente-analista-bi",
    nome: "Atlas — Analista de Métricas & BI",
    papel: "Relatórios de Vendas & Desempenho",
    categoria: "colaboradores",
    avatar: "📊",
    cor: "from-blue-600 to-cyan-600",
    descricao: "Sintetiza estatísticas de atendimento, tempo de resposta e volume de vendas em resumos executivos.",
    capacidades: ["Métricas de Atendimento", "Análise de Churn", "Relatórios de Desempenho", "Insights de Crescimento"],
    promptInicial: "Olá! Sou o Atlas, analista de dados. Digite 'gerar relatório' para ver as métricas da sua empresa."
  }
];

export function AgentsPage() {
  const [agenteSelecionado, setAgenteSelecionado] = useState<Agent>(AGENTES[0]!);
  const [mensagens, setMensagens] = useState<Array<{ remetente: "user" | "agent"; texto: string; imagemUrl?: string; videoUrl?: string }>>([
    { remetente: "agent", texto: AGENTES[0]!.promptInicial }
  ]);
  const [inputTexto, setInputTexto] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(false);

  const trocarAgente = (agente: Agent) => {
    setAgenteSelecionado(agente);
    setMensagens([{ remetente: "agent", texto: agente.promptInicial }]);
  };

  const enviarMensagem = () => {
    if (!inputTexto.trim()) return;

    const textoUsuario = inputTexto;
    setInputTexto("");
    setMensagens((prev) => [...prev, { remetente: "user", texto: textoUsuario }]);
    setCarregando(true);

    setTimeout(() => {
      let respostaTexto = `Compreendido! Como agente ${agenteSelecionado.nome}, processei sua solicitação: "${textoUsuario}".`;
      let img: string | undefined = undefined;
      let vid: string | undefined = undefined;

      if (agenteSelecionado.id === "agente-imagens") {
        respostaTexto = `🎨 Imagem gerada com sucesso para o prompt: "${textoUsuario}"!`;
        img = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
      } else if (agenteSelecionado.id === "agente-videos") {
        respostaTexto = `🎬 Roteiro e vídeo gerados com sucesso!\n\n📹 **Cena 1**: Apresentação da marca.\n📹 **Cena 2**: Demonstração do AtendeChat.\n📹 **Cena 3**: Chamada para Ação!`;
        vid = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
      } else if (agenteSelecionado.id === "agente-vendas") {
        respostaTexto = `Entendido! Aqui está o script de atendimento personalizado:\n\n"Olá! Seja bem-vindo. Nosso plano Pro inclui WhatsApp + IA com liberação imediata por R$ 349/mês. Posso enviar seu link de ativação agora?"`;
      } else if (agenteSelecionado.id === "agente-analista-bi") {
        respostaTexto = `📊 **Relatório Executivo de Vendas & Atendimento**:\n\n• Conversas Ativas: 42\n• Tempo Médio de Resposta: 45 segundos\n• Avaliação de Satisfação (NPS): 4.9/5.0 ⭐\n• Taxa de Conversão: 34%`;
      }

      setMensagens((prev) => [
        ...prev,
        { remetente: "agent", texto: respostaTexto, imagemUrl: img, videoUrl: vid }
      ]);
      setCarregando(false);
    }, 1200);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-bold text-fuchsia-700">
            <Sparkles className="w-4 h-4 text-fuchsia-500" />
            Central de Agentes de IA Autônomos
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">
            Chat de Agentes & Gerador Multimídia
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Agentes especializados para atender clientes, apoiar colaboradores e gerar imagens/vídeos automaticamente.
          </p>
        </div>
      </div>

      {/* Grid Principal: Lista de Agentes + Chat Ativo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Seleção de Agentes */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Selecione o Agente de IA:
          </h2>

          <div className="space-y-2.5">
            {AGENTES.map((a) => (
              <div
                key={a.id}
                onClick={() => trocarAgente(a)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  agenteSelecionado.id === a.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20"
                    : "bg-white border-slate-200 text-slate-900 hover:border-fuchsia-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.cor} text-white flex items-center justify-center text-xl font-bold flex-none`}
                  >
                    {a.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold truncate">{a.nome}</h3>
                    <p className={`text-[11px] truncate ${agenteSelecionado.id === a.id ? "text-slate-300" : "text-slate-500"}`}>
                      {a.papel}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Janela de Chat do Agente Ativo */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-[600px] overflow-hidden">
          {/* Header do Agente Ativo */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agenteSelecionado.cor} text-white flex items-center justify-center text-xl shadow-md`}>
                {agenteSelecionado.avatar}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{agenteSelecionado.nome}</h3>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Agente Ativo 24/7
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {agenteSelecionado.capacidades.map((cap) => (
                <span key={cap} className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Histórico de Mensagens */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {mensagens.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.remetente === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.remetente === "agent" && (
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agenteSelecionado.cor} text-white flex items-center justify-center text-sm flex-none`}>
                    {agenteSelecionado.avatar}
                  </div>
                )}

                <div
                  className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed space-y-3 ${
                    msg.remetente === "user"
                      ? "bg-fuchsia-600 text-white font-medium rounded-tr-none"
                      : "bg-slate-100 text-slate-800 rounded-tl-none font-medium"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.texto}</p>

                  {/* Renderizador de Imagem se for gerado por Agente de Imagem */}
                  {msg.imagemUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
                      <img src={msg.imagemUrl} alt="Imagem IA Gerada" className="w-full h-48 object-cover" />
                      <div className="p-2 bg-slate-900 text-white flex items-center justify-between text-[10px]">
                        <span>Imagem HD Gerada via IA</span>
                        <a href={msg.imagemUrl} target="_blank" download className="text-fuchsia-400 font-bold flex items-center gap-1 hover:underline">
                          <Download className="w-3 h-3" /> Baixar Imagem
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Renderizador de Vídeo se for gerado por Agente de Vídeo */}
                  {msg.videoUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
                      <video src={msg.videoUrl} controls className="w-full h-48 bg-black" />
                      <div className="p-2 bg-slate-900 text-white flex items-center justify-between text-[10px]">
                        <span>Vídeo Animação Pronta</span>
                        <a href={msg.videoUrl} target="_blank" download className="text-fuchsia-400 font-bold flex items-center gap-1 hover:underline">
                          <Download className="w-3 h-3" /> Baixar Vídeo MP4
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {carregando && (
              <div className="flex gap-3 justify-start items-center">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agenteSelecionado.cor} text-white flex items-center justify-center text-sm animate-spin`}>
                  <RefreshCw className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-400 animate-pulse font-medium">
                  {agenteSelecionado.nome} está processando sua solicitação...
                </span>
              </div>
            )}
          </div>

          {/* Campo de Entrada de Mensagem */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviarMensagem();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={`Interagir com ${agenteSelecionado.nome}...`}
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value)}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-500 bg-white"
              />
              <button
                type="submit"
                disabled={!inputTexto.trim()}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-40"
              >
                <Send className="w-4 h-4" /> Enviar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
