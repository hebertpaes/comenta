import { useState } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Send,
  Download,
  RefreshCw,
  Mic,
  Paperclip,
  Code,
  Zap,
  Globe,
  Bot,
  Sliders,
  ChevronDown
} from "lucide-react";

export type Agent = {
  id: string;
  nome: string;
  papel: string;
  avatar: string;
  cor: string;
  descricao: string;
  capacidades: string[];
  promptInicial: string;
};

const AGENTES: Agent[] = [
  {
    id: "gemini-spark",
    nome: "Sofia Gemini 2.0 Spark (Google IA Oficial)",
    papel: "Inteligência Artificial Multimodal Completa",
    avatar: "✨",
    cor: "linear-gradient(135deg, #4285F4, #9B51E0, #E91E63)",
    descricao: "Agente principal de IA com capacidades avançadas em texto, raciocínio comercial, imagens e vídeos.",
    capacidades: ["Gemini 2.0 Flash", "Visão Multimodal", "Prompt Engineering", "Integração Comenta"],
    promptInicial: "Olá! Sou a Sofia Gemini 2.0 Spark. Como posso ajudar com sua empresa, criação de imagens, vídeos ou automações hoje?"
  },
  {
    id: "agente-imagens",
    nome: "Pixel Imagen 3 — Artes & Imagens HD",
    papel: "Gerador de Banners, Posts & Logos IA",
    avatar: "🎨",
    cor: "linear-gradient(135deg, #F59E0B, #EF4444)",
    descricao: "Gera ilustrações HD, banners promocionais de vendas e posts para redes sociais em segundos.",
    capacidades: ["Google Imagen 3 HD", "Fotos de Produtos", "Formatos 1:1 e 9:16", "Alta Resolução"],
    promptInicial: "Olá! O que você gostaria de desenhar ou criar em imagem HD hoje?"
  },
  {
    id: "agente-videos",
    nome: "Veo AI — Vídeos & Animações Promocionais",
    papel: "Gerador de Roteiros & Vídeos para Mídias",
    avatar: "🎬",
    cor: "linear-gradient(135deg, #8B5CF6, #6366F1)",
    descricao: "Cria animações e vídeos curtos de 15s/30s prontos para publicação no Instagram Reels e TikTok.",
    capacidades: ["Google Veo Video AI", "Roteiros de Vendas", "Animação 4K", "Legendas Dinâmicas"],
    promptInicial: "Olá! Qual produto ou oferta você quer transformar em um vídeo publicitário incrível?"
  },
  {
    id: "agente-bi",
    nome: "Atlas Analytics — BI & Raciocínio Profundo",
    papel: "Relatórios de Vendas & Desempenho",
    avatar: "📊",
    cor: "linear-gradient(135deg, #10B981, #06B6D4)",
    descricao: "Analisa conversas, taxas de conversão de leads e relatórios executivos em tempo real.",
    capacidades: ["Gemini Thinking Pro", "Métricas de Atendimento", "Análise de Vendas", "Insights de Crescimento"],
    promptInicial: "Olá! Sou o Atlas Analytics. Solicite um relatório de vendas ou métricas de atendimento a qualquer momento."
  }
];

export function AgentsPage() {
  const [agenteSelecionado, setAgenteSelecionado] = useState<Agent>(AGENTES[0]!);
  const [modeloAtivo, setModeloAtivo] = useState<string>("gemini-2.0-flash");
  const [mensagens, setMensagens] = useState<Array<{ remetente: "user" | "agent"; texto: string; imagemUrl?: string; videoUrl?: string }>>([
    { remetente: "agent", texto: AGENTES[0]!.promptInicial }
  ]);
  const [inputTexto, setInputTexto] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(false);

  const trocarAgente = (agente: Agent) => {
    setAgenteSelecionado(agente);
    setMensagens([{ remetente: "agent", texto: agente.promptInicial }]);
  };

  const enviarMensagemPrompt = (promptText?: string) => {
    const textoFinal = (promptText || inputTexto).trim();
    if (!textoFinal) return;

    setInputTexto("");
    setMensagens((prev) => [...prev, { remetente: "user", texto: textoFinal }]);
    setCarregando(true);

    setTimeout(() => {
      let respostaTexto = `Compreendido! Como agente ${agenteSelecionado.nome}, processei sua solicitação no modelo ${modeloAtivo}: "${textoFinal}".`;
      let img: string | undefined = undefined;
      let vid: string | undefined = undefined;

      if (agenteSelecionado.id === "agente-imagens" || textoFinal.toLowerCase().includes("imagem") || textoFinal.toLowerCase().includes("banner")) {
        respostaTexto = `🎨 Imagem HD gerada com sucesso via Google Imagen 3 para o prompt: "${textoFinal}"!`;
        img = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
      } else if (agenteSelecionado.id === "agente-videos" || textoFinal.toLowerCase().includes("vídeo") || textoFinal.toLowerCase().includes("roteiro")) {
        respostaTexto = `🎬 Roteiro e vídeo animado gerados com sucesso via Google Veo AI!\n\n📹 **Cena 1**: Apresentação visual da oferta.\n📹 **Cena 2**: Demonstração de recursos do Comenta SaaS.\n📹 **Cena 3**: Call to Action com direcionamento para WhatsApp.`;
        vid = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
      } else if (agenteSelecionado.id === "agente-bi") {
        respostaTexto = `📊 **Relatório Executivo de Vendas & Atendimento**:\n\n• Conversas Ativas: 42\n• Tempo Médio de Resposta: 14s\n• Avaliação de Satisfação (NPS): 9.8 / 10 ⭐\n• Vendas Acumuladas: R$ 14.890,00`;
      }

      setMensagens((prev) => [
        ...prev,
        { remetente: "agent", texto: respostaTexto, imagemUrl: img, videoUrl: vid }
      ]);
      setCarregando(false);
    }, 1200);
  };

  return (
    <div style={{ paddingBottom: 40, maxWidth: 1280, margin: "0 auto" }}>
      {/* Google Gemini Spark Interface Header */}
      <div
        className="card"
        style={{
          padding: 24,
          borderRadius: 24,
          marginBottom: 20,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: "linear-gradient(135deg, #4285F4, #9B51E0, #E91E63)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                fontSize: 24,
                boxShadow: "0 4px 20px rgba(66, 133, 244, 0.4)",
              }}
            >
              ✨
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>
                  Google Gemini Spark AI
                </h1>
                <span className="tag" style={{ background: "rgba(66, 133, 244, 0.15)", color: "#3b82f6", border: "1px solid #3b82f6", fontSize: 10 }}>
                  gemini.google.com/spark
                </span>
              </div>
              <p className="muted" style={{ margin: "2px 0 0 0", fontSize: 13 }}>
                Ambiente de Inteligência Artificial Multimodal com geração de texto, imagens Imagen 3 e vídeos Veo.
              </p>
            </div>
          </div>

          {/* Seletor de Modelo de IA */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Modelo:</span>
            <select
              value={modeloAtivo}
              onChange={(e) => setModeloAtivo(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                background: "var(--panel2)",
                border: "1px solid var(--border)",
                color: "var(--text)"
              }}
            >
              <option value="gemini-2.0-flash">✦ Gemini 2.0 Flash (Mais Rápido)</option>
              <option value="gemini-thinking">🧠 Gemini Thinking Pro (Raciocínio)</option>
              <option value="imagen-3">🎨 Google Imagen 3 (Imagens HD)</option>
              <option value="veo-video">🎬 Google Veo AI (Vídeos MP4)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Principal: Seletor de Agentes + Workspace do Gemini Spark */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        {/* Painel Lateral de Agentes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", paddingLeft: 4 }}>
            Agentes Especializados Gemini Spark
          </span>

          {AGENTES.map((a) => (
            <div
              key={a.id}
              onClick={() => trocarAgente(a)}
              style={{
                padding: 14,
                borderRadius: 16,
                border: agenteSelecionado.id === a.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: agenteSelecionado.id === a.id ? "rgba(109, 40, 217, 0.12)" : "var(--panel)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: a.cor,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 20,
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  {a.avatar}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.nome}
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.papel}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Workspace Estilo Google Gemini Spark */}
        <div
          className="card"
          style={{
            padding: 0,
            borderRadius: 24,
            display: "flex",
            flexDirection: "column",
            minHeight: 620,
            overflow: "hidden",
            background: "var(--panel)",
            border: "1px solid var(--border)"
          }}
        >
          {/* Header do Agente Ativo */}
          <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", background: "var(--panel2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: agenteSelecionado.cor, color: "#fff", display: "grid", placeItems: "center", fontSize: 18 }}>
                {agenteSelecionado.avatar}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{agenteSelecionado.nome}</div>
                <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} /> Agente Online & Pronto
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {agenteSelecionado.capacidades.map((cap) => (
                <span key={cap} className="tag" style={{ fontSize: 10, background: "var(--panel)" }}>
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Área de Mensagens / Chat Spark */}
          <div style={{ flex: 1, padding: 22, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {mensagens.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: msg.remetente === "user" ? "flex-end" : "flex-start"
                }}
              >
                {msg.remetente === "agent" && (
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: agenteSelecionado.cor, color: "#fff", display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0 }}>
                    {agenteSelecionado.avatar}
                  </div>
                )}

                <div
                  style={{
                    maxWidth: "75%",
                    padding: "12px 18px",
                    borderRadius: 18,
                    fontSize: 14,
                    lineHeight: 1.5,
                    background: msg.remetente === "user" ? "var(--accent)" : "var(--panel2)",
                    color: msg.remetente === "user" ? "#fff" : "var(--text)",
                    borderBottomLeftRadius: msg.remetente === "agent" ? 4 : 18,
                    borderBottomRightRadius: msg.remetente === "user" ? 4 : 18,
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.texto}</div>

                  {/* Renderizar Imagem Gerada */}
                  {msg.imagemUrl && (
                    <div style={{ marginTop: 12, borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <img src={msg.imagemUrl} alt="Imagem IA Gerada" style={{ width: "100%", height: 220, objectFit: "cover" }} />
                      <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.8)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                        <span>🎨 Imagem HD Gerada via Google Imagen 3</span>
                        <a href={msg.imagemUrl} target="_blank" rel="noopener noreferrer" download style={{ color: "#a855f7", fontWeight: 700, textDecoration: "none" }}>
                          ⬇️ Baixar Imagem
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Renderizar Vídeo Gerado */}
                  {msg.videoUrl && (
                    <div style={{ marginTop: 12, borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <video src={msg.videoUrl} controls style={{ width: "100%", height: 220, background: "#000" }} />
                      <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.8)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                        <span>🎬 Vídeo Promocional Gerado via Google Veo</span>
                        <a href={msg.videoUrl} target="_blank" rel="noopener noreferrer" download style={{ color: "#a855f7", fontWeight: 700, textDecoration: "none" }}>
                          ⬇️ Baixar MP4
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {carregando && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: agenteSelecionado.cor, color: "#fff", display: "grid", placeItems: "center", fontSize: 12 }}>
                  ✨
                </div>
                <span className="muted" style={{ fontSize: 13 }}>
                  Sofia Gemini Spark está processando seu comando no modelo {modeloAtivo}...
                </span>
              </div>
            )}
          </div>

          {/* Prompt Cards Sugeridos estilo Gemini Spark */}
          <div style={{ padding: "0 22px 12px 22px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {[
              { label: "🎨 Gerar Banner de Vendas", prompt: "Crie um banner promocional para o WhatsApp sobre nosso curso de IA." },
              { label: "🎬 Criar Vídeo para Reels", prompt: "Gere um roteiro e vídeo animado de 15 segundos para mídias sociais." },
              { label: "📝 Redigir Script Comercial", prompt: "Escreva um script de atendimento matador para converter leads no WhatsApp." },
              { label: "📊 Ver Métricas do Sistema", prompt: "Gere um relatório executivo de métricas de vendas e atendimento." }
            ].map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => enviarMensagemPrompt(card.prompt)}
                className="ghost"
                style={{ fontSize: 11, padding: "8px 12px", borderRadius: 10, textAlign: "left" }}
              >
                {card.label}
              </button>
            ))}
          </div>

          {/* Multimodal Prompt Input Composer Bar (Gemini Spark Style) */}
          <div style={{ padding: 16, borderTop: "1px solid var(--border)", background: "var(--panel2)" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviarMensagemPrompt();
              }}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <button type="button" className="ghost" title="Anexar Imagem ou Arquivo" style={{ padding: "10px 12px" }}>
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={`Pergunte ao Gemini Spark ou solicite imagens/vídeos...`}
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value)}
                style={{ flex: 1, padding: "12px 16px", borderRadius: 14, fontSize: 14 }}
              />

              <button type="button" className="ghost" title="Ativar Microfone / Voz" style={{ padding: "10px 12px" }}>
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={!inputTexto.trim()}
                style={{
                  padding: "12px 20px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #4285F4, #9B51E0, #E91E63)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <span>Enviar</span> ✨
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
