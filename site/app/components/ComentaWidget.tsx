"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, ThumbsUp, Sparkles, ShieldCheck, Filter, 
  Send, CornerDownRight, CheckCircle2, AlertCircle, Bot, RefreshCw, User
} from "lucide-react";

export interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  role?: string;
  text: string;
  timestamp: string;
  likes: number;
  liked: boolean;
  aiStatus: "approved" | "analyzed" | "flagged";
  aiSentiment: "positivo" | "neutro" | "construtivo";
  aiScore: number; // 0 a 100 via TypeSafe Jev
  aiReply?: string;
  replies: CommentItem[];
}

const INITIAL_COMMENTS: CommentItem[] = [
  {
    id: "c1",
    author: "Dr. Gabriel Santos",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
    role: "Médico Nutrólogo",
    text: "O sistema de atendimento automatizado via WhatsApp reduziu o tempo de espera dos nossos pacientes de 45 minutos para menos de 10 segundos. Fantástico!",
    timestamp: "Há 15 minutos",
    likes: 24,
    liked: false,
    aiStatus: "approved",
    aiSentiment: "positivo",
    aiScore: 98,
    aiReply: "🤖 **Resposta da Sofia IA (Comenta AI)**: Olá Dr. Gabriel! Ficamos honrados em otimizar o atendimento da sua clínica. A retenção no WhatsApp é uma das nossas prioridades!",
    replies: [
      {
        id: "c1-1",
        author: "Dra. Mariana Costa",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80",
        role: "Gestora de Saúde",
        text: "Vocês usam a integração com n8n ou o fluxo nativo?",
        timestamp: "Há 8 minutos",
        likes: 5,
        liked: false,
        aiStatus: "approved",
        aiSentiment: "neutro",
        aiScore: 92,
        replies: []
      }
    ]
  },
  {
    id: "c2",
    author: "Rodrigo Mendonça",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
    role: "Diretor de E-Commerce",
    text: "Testamos as gomas de creatina Gumesmomo Fit e o módulo de carrinho no WhatsApp. A taxa de conversão nos disparos subiu 34%!",
    timestamp: "Há 1 hora",
    likes: 42,
    liked: true,
    aiStatus: "approved",
    aiSentiment: "positivo",
    aiScore: 96,
    aiReply: "🤖 **Resposta da Sofia IA (Comenta AI)**: Excelente resultado, Rodrigo! O disparo de campanhas com catálogo dinâmico de produtos tem demonstrado alto engajamento.",
    replies: []
  },
  {
    id: "c3",
    author: "Camila Fernandes",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    role: "Aluna da Academia IA",
    text: "O curso prático de automação com n8n e TypeSafe Jev abriu totalmente minha visão sobre modelos System One de baixa latência.",
    timestamp: "Há 3 horas",
    likes: 18,
    liked: false,
    aiStatus: "approved",
    aiSentiment: "positivo",
    aiScore: 95,
    replies: []
  }
];

export default function ComentaWidget() {
  const [comments, setComments] = useState<CommentItem[]>(INITIAL_COMMENTS);
  const [newCommentText, setNewCommentText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filterType, setFilterType] = useState<"todos" | "aprovados" | "mais_votados">("todos");
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Submeter novo comentário com moderação de IA em tempo real (TypeSafe Jev / Gemini 2.0)
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsProcessingAI(true);
    const author = authorName.trim() || "Visitante";

    // Simulação do julgamento do modelo TypeSafe Jev System One (70-300ms)
    setTimeout(() => {
      const isPositive = !newCommentText.toLowerCase().includes("ruim") && !newCommentText.toLowerCase().includes("pessimo");
      
      const newComment: CommentItem = {
        id: `c-${Date.now()}`,
        author: author,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author)}`,
        role: "Comentarista",
        text: newCommentText,
        timestamp: "Agora mesmo",
        likes: 1,
        liked: true,
        aiStatus: "approved",
        aiSentiment: isPositive ? "positivo" : "construtivo",
        aiScore: Math.floor(88 + Math.random() * 11),
        aiReply: `🤖 **Resposta da Sofia IA (Comenta AI)**: Olá ${author}! Obrigado por fazer parte da nossa comunidade. Seu comentário foi analisado e aprovado pelo modelo TypeSafe Jev.`,
        replies: []
      };

      setComments([newComment, ...comments]);
      setNewCommentText("");
      setIsProcessingAI(false);
    }, 400);
  };

  // Responder a um comentário
  const handleAddReply = (parentId: string) => {
    if (!replyText.trim()) return;

    const newReply: CommentItem = {
      id: `r-${Date.now()}`,
      author: "Você",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Voce",
      role: "Membro",
      text: replyText,
      timestamp: "Agora mesmo",
      likes: 0,
      liked: false,
      aiStatus: "approved",
      aiSentiment: "positivo",
      aiScore: 90,
      replies: []
    };

    setComments(comments.map(c => {
      if (c.id === parentId) {
        return { ...c, replies: [...c.replies, newReply] };
      }
      return c;
    }));

    setReplyToId(null);
    setReplyText("");
  };

  // Curtir / Descurtir
  const toggleLike = (id: string) => {
    setComments(comments.map(c => {
      if (c.id === id) {
        return {
          ...c,
          likes: c.liked ? c.likes - 1 : c.likes + 1,
          liked: !c.liked
        };
      }
      return c;
    }));
  };

  // Gerar nova resposta de IA sob demanda
  const generateAIReply = (id: string) => {
    setIsProcessingAI(true);
    setTimeout(() => {
      setComments(comments.map(c => {
        if (c.id === id) {
          return {
            ...c,
            aiReply: `🤖 **IA Resposta Atualizada (Gemini 2.0 Flash)**: Analisei seu feedback com base nos dados do ecossistema Comenta & IntSoft. Estamos à disposição para ajudar!`
          };
        }
        return c;
      }));
      setIsProcessingAI(false);
    }, 500);
  };

  // Filtragem
  const filteredComments = comments.filter(c => {
    if (filterType === "aprovados") return c.aiStatus === "approved";
    return true;
  }).sort((a, b) => {
    if (filterType === "mais_votados") return b.likes - a.likes;
    return 0;
  });

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
      
      {/* Cabeçalho do Widget Comenta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              Sistema Comenta Native <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">Ao Vivo</span>
            </h3>
            <p className="text-xs text-slate-400">Moderação Instantânea por IA • TypeSafe Jev & Gemini 2.0 Flash</p>
          </div>
        </div>

        {/* Filtros de Comentários */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button 
            onClick={() => setFilterType("todos")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterType === "todos" ? "bg-fuchsia-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            Todos ({comments.length})
          </button>
          <button 
            onClick={() => setFilterType("aprovados")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterType === "aprovados" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            Aprovados IA
          </button>
          <button 
            onClick={() => setFilterType("mais_votados")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterType === "mais_votados" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            🔥 Mais Votados
          </button>
        </div>
      </div>

      {/* Formulário para Novo Comentário */}
      <form onSubmit={handleAddComment} className="my-6 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
            <User className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Seu Nome / Empresa (opcional)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
          />
        </div>

        <textarea
          rows={3}
          placeholder="Escreva seu comentário, dúvida ou feedback..."
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          required
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500 resize-none"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verificação em 70ms via TypeSafe Jev</span>
          </div>

          <button
            type="submit"
            disabled={isProcessingAI || !newCommentText.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-fuchsia-500/25 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isProcessingAI ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analisando IA...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Publicar Comentário
              </>
            )}
          </button>
        </div>
      </form>

      {/* Lista de Comentários */}
      <div className="space-y-6">
        {filteredComments.map((comment) => (
          <div key={comment.id} className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all space-y-4">
            
            {/* Topo do Comentário */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={comment.avatar} alt={comment.author} className="w-10 h-10 rounded-full border border-slate-700 object-cover" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{comment.author}</span>
                    {comment.role && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                        {comment.role}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">{comment.timestamp}</span>
                </div>
              </div>

              {/* Badge de Moderação por IA */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Score IA: {comment.aiScore}%
                </span>
              </div>
            </div>

            {/* Texto do Comentário */}
            <p className="text-sm text-slate-200 leading-relaxed pl-13">
              {comment.text}
            </p>

            {/* Ações: Curtir, Responder, IA Reply */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleLike(comment.id)}
                  className={`flex items-center gap-1.5 hover:text-fuchsia-400 transition-colors ${comment.liked ? "text-fuchsia-400 font-bold" : ""}`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{comment.likes}</span>
                </button>

                <button
                  onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <CornerDownRight className="w-4 h-4" />
                  <span>Responder</span>
                </button>
              </div>

              <button
                onClick={() => generateAIReply(comment.id)}
                className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors font-semibold"
              >
                <Bot className="w-3.5 h-3.5" />
                Atualizar Resposta IA
              </button>
            </div>

            {/* Resposta Gerada Automaticamente pela IA (Sofia 2.0 / Gemini 2.0) */}
            {comment.aiReply && (
              <div className="ml-6 sm:ml-10 bg-purple-950/30 border border-purple-800/40 rounded-xl p-4 text-xs text-purple-200 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-600/30 flex items-center justify-center text-purple-400 flex-none border border-purple-500/40">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-purple-300 text-[11px] uppercase tracking-wider">Sofia IA (Automação Comenta)</div>
                  <p className="leading-relaxed">{comment.aiReply.replace("🤖 **Resposta da Sofia IA (Comenta AI)**: ", "").replace("🤖 **IA Resposta Atualizada (Gemini 2.0 Flash)**: ", "")}</p>
                </div>
              </div>
            )}

            {/* Caixa de Entrada para Resposta de Usuário */}
            {replyToId === comment.id && (
              <div className="ml-6 sm:ml-10 pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escreva uma resposta..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                />
                <button
                  onClick={() => handleAddReply(comment.id)}
                  className="px-4 py-2 rounded-xl bg-fuchsia-600 text-white font-bold text-xs hover:bg-fuchsia-500 transition-colors"
                >
                  Enviar
                </button>
              </div>
            )}

            {/* Respostas Aninhadas de Usuários */}
            {comment.replies.length > 0 && (
              <div className="ml-6 sm:ml-10 space-y-3 pt-2 border-l-2 border-slate-800 pl-4">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <img src={reply.avatar} alt={reply.author} className="w-6 h-6 rounded-full border border-slate-700" />
                      <span className="font-bold text-xs text-white">{reply.author}</span>
                      <span className="text-[10px] text-slate-500">{reply.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-300 pl-8">{reply.text}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
}
