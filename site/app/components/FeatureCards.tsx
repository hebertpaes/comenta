"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Sparkles,
  Zap,
  FileText,
  Bot,
  Kanban,
  FolderGit2,
  Clock,
  Command,
  Tag,
  Megaphone,
  Star,
  Users,
  GraduationCap,
  Activity,
  Webhook,
  ShieldCheck,
  Contact,
  X,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Play
} from "lucide-react";

export type Feature = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  categoria: "ia" | "operacao" | "disparos" | "dev";
  color: string;
  detalhes: {
    oQueFaz: string;
    beneficio: string;
    simuladorTipo: "chat" | "kanban" | "ai" | "nps" | "webhook" | "campanha";
    exemplo: any;
  };
  linkRecurso?: string;
};

const FEATURES: Feature[] = [
  {
    id: "caixa-entrada",
    icon: "💬",
    title: "Tudo em uma caixa de entrada",
    desc: "WhatsApp, Instagram Direct, Messenger e o chat do site num só lugar. Nenhuma mensagem cai no vácuo.",
    categoria: "operacao",
    color: "from-fuchsia-500 to-pink-500",
    detalhes: {
      oQueFaz: "Centraliza todas as mensagens recebidas de múltiplos números de WhatsApp, páginas de Facebook, Instagram Direct e Webchat em um único painel unificado.",
      beneficio: "Elimina a necessidade de trocar de celular ou aplicativo. Toda a equipe atende junto sem perder conversas.",
      simuladorTipo: "chat",
      exemplo: {
        mensagens: [
          { remetente: "Cliente", texto: "Olá! Vocês atendem aos sábados?", canal: "WhatsApp" },
          { remetente: "Atendente (Ana)", texto: "Sim! Nosso horário no sábado é das 09h às 14h 😊", canal: "Painel" }
        ]
      }
    },
    linkRecurso: "/recursos/whatsapp"
  },
  {
    id: "ia-classifica",
    icon: "✨",
    title: "IA que classifica e prioriza",
    desc: "Cada conversa é organizada e priorizada automaticamente pela IA da Anthropic (Claude).",
    categoria: "ia",
    color: "from-violet-500 to-indigo-500",
    detalhes: {
      oQueFaz: "Analisa o sentimento e a intenção da mensagem inicial para classificar a urgência (Alta, Média, Baixa) e marcar o tipo de solicitação.",
      beneficio: "Casos graves ou clientes em potencial são atendidos imediatamente antes de dúvidas simples.",
      simuladorTipo: "ai",
      exemplo: {
        entrada: "Meu sistema está fora do ar e preciso emitir nota agora!",
        classificacao: "Urgente / Suporte Técnico",
        prioridade: "Alta (Fura-fila automático)"
      }
    },
    linkRecurso: "/recursos/robos-ia"
  },
  {
    id: "respostas-sugeridas",
    icon: "⚡",
    title: "Respostas sugeridas pela IA",
    desc: "A IA escreve a melhor resposta com base no histórico. Você só revisa e envia.",
    categoria: "ia",
    color: "from-amber-500 to-orange-500",
    detalhes: {
      oQueFaz: "Gera rascunhos de resposta personalizados com linguagem natural usando o modelo Claude Sonnet 3.7.",
      beneficio: "Reduz o tempo médio de digitação de 3 minutos para 5 segundos com apenas 1 clique.",
      simuladorTipo: "ai",
      exemplo: {
        pergunta: "Qual o prazo de entrega para o CEP 78000-000?",
        sugestao: "Para Cuiabá (CEP 78000-000), nosso prazo de entrega é de 2 dias úteis via transportadora expressa."
      }
    },
    linkRecurso: "/recursos/robos-ia"
  },
  {
    id: "resumo-conversas",
    icon: "📝",
    title: "Resumo automático de conversas",
    desc: "Entenda todo o histórico em segundos — qualquer pessoa do time assume sem se perder.",
    categoria: "ia",
    color: "from-emerald-500 to-teal-500",
    detalhes: {
      oQueFaz: "Sintetiza conversas de 50+ mensagens em um boletim de 3 linhas apontando o problema, o que já foi tentado e a solução.",
      beneficio: "Troca de turno perfeita: o novo atendente lê o resumo e continua sem perguntar tudo de novo ao cliente.",
      simuladorTipo: "ai",
      exemplo: {
        resumo: "• Cliente relatou cobrança em duplicidade\n• Enviou comprovante bancário de R$ 150,00\n• Financeiro já autorizou estorno via Pix"
      }
    },
    linkRecurso: "/recursos/robos-ia"
  },
  {
    id: "autoatendimento-handoff",
    icon: "🤖",
    title: "Autoatendimento com handoff inteligente",
    desc: "A IA responde sozinha as dúvidas simples e passa para uma pessoa no instante em que o caso pede.",
    categoria: "ia",
    color: "from-purple-500 to-fuchsia-500",
    detalhes: {
      oQueFaz: "Responde dúvidas frequentes 24 horas por dia. Se o cliente pedir um humano ou demonstrar insatisfação, transfere na hora.",
      beneficio: "Atendimento 24/7 sem deixar o cliente preso em menuzinhos ou árvores de robô travadas.",
      simuladorTipo: "chat",
      exemplo: {
        bot: "Atendimento automático IA ativo.",
        handoff: "Transferindo para equipe humana na fila 'Financeiro'..."
      }
    },
    linkRecurso: "/recursos/robos-ia"
  },
  {
    id: "kanban-atendimento",
    icon: "📋",
    title: "Kanban de atendimento",
    desc: "Arraste a conversa entre aguardando, em atendimento e resolvida. O status muda junto.",
    categoria: "operacao",
    color: "from-blue-500 to-indigo-500",
    detalhes: {
      oQueFaz: "Quadro visual em colunas estilo Trello/Jira para acompanhar cada atendimento por estágio de resolução.",
      beneficio: "Visão clara do gargalo da equipe e controle de produtividade em tempo real.",
      simuladorTipo: "kanban",
      exemplo: {
        colunas: ["Aguardando (3)", "Em Atendimento (5)", "Resolvido (12)"]
      }
    },
    linkRecurso: "/recursos/marketing"
  },
  {
    id: "filas-departamento",
    icon: "🗂️",
    title: "Filas por departamento",
    desc: "Vendas, suporte, financeiro — cada fila com sua equipe e seu horário de funcionamento.",
    categoria: "operacao",
    color: "from-teal-500 to-emerald-500",
    detalhes: {
      oQueFaz: "Roteia conversas automaticamente para grupos especializados com base nas opções do cliente ou regras de negócio.",
      beneficio: "Garante que perguntas financeiras vão para o Financeiro e compras vão direto para Vendas.",
      simuladorTipo: "kanban",
      exemplo: {
        filas: ["Suporte Técnico", "Vendas & Planos", "Financeiro & Faturamento"]
      }
    },
    linkRecurso: "/recursos/automacoes"
  },
  {
    id: "horario-comercial",
    icon: "🕐",
    title: "Horário comercial automático",
    desc: "Fora do expediente o cliente recebe um aviso na hora, em vez de silêncio até o dia seguinte.",
    categoria: "operacao",
    color: "from-slate-500 to-slate-700",
    detalhes: {
      oQueFaz: "Dispara mensagem personalizada automática quando mensagens chegam fora do horário configurado por departamento.",
      beneficio: "Define expectativas claras e evita notas baixas por demora no período noturno.",
      simuladorTipo: "chat",
      exemplo: {
        aviso: "Nosso expediente encerrou às 18h. Retornaremos seu contato amanhã às 08h!"
      }
    },
    linkRecurso: "/recursos/automacoes"
  },
  {
    id: "respostas-rapidas",
    icon: "⌨️",
    title: "Respostas rápidas por atalhos",
    desc: "Atalhos para o que sua equipe repete o dia inteiro. Digita o atalho, sai o texto completo.",
    categoria: "operacao",
    color: "from-lime-500 to-green-500",
    detalhes: {
      oQueFaz: "Permite cadastrar trechos de texto com variáveis. Digitando '/pix' o sistema insere a chave e instruções de pagamento.",
      beneficio: "Elimina erros de digitação e padroniza as respostas de toda a equipe.",
      simuladorTipo: "chat",
      exemplo: {
        atalho: "/pix",
        resultado: "Nossa chave Pix CNPJ é 00.000.000/0001-00 (Comenta Tecnologia)."
      }
    },
    linkRecurso: "/recursos/automacoes"
  },
  {
    id: "tags-notas",
    icon: "🏷️",
    title: "Tags e notas internas confidenciais",
    desc: "Marque o assunto e deixe recados que só a equipe vê — o cliente nunca enxerga.",
    categoria: "operacao",
    color: "from-orange-500 to-amber-500",
    detalhes: {
      oQueFaz: "Adiciona etiquetas coloridas aos contatos e insere notas secretas no histórico que não chegam no WhatsApp do cliente.",
      beneficio: "Comunicação interna limpa entre atendentes e supervisores dentro do próprio atendimento.",
      simuladorTipo: "chat",
      exemplo: {
        nota: "🔒 Nota Interna: Cliente solicitou desconto de 10% aprovado pelo gerente João."
      }
    },
    linkRecurso: "/recursos/marketing"
  },
  {
    id: "campanhas-massa",
    icon: "📣",
    title: "Campanhas com ritmo humano anti-bloqueio",
    desc: "Envio espaçado, em lotes e dentro do horário comercial — para o número não ser bloqueado.",
    categoria: "disparos",
    color: "from-pink-500 to-rose-500",
    detalhes: {
      oQueFaz: "Orquestra disparos em massa com atrasos randômicos entre mensagens (ex: 5 a 15s) e pausa entre lotes.",
      beneficio: "Protege seus números do WhatsApp contra bloqueio por spam mantendo alta taxa de entrega.",
      simuladorTipo: "campanha",
      exemplo: {
        lote: "Lote 1: 50 mensagens enviadas (Pausa de 3 min antes do próximo lote)"
      }
    },
    linkRecurso: "/recursos/campanhas"
  },
  {
    id: "avaliacao-nps",
    icon: "⭐",
    title: "Avaliação NPS pós-atendimento",
    desc: "Ao resolver, o cliente recebe a pesquisa e a nota volta para o painel automaticamente.",
    categoria: "operacao",
    color: "from-yellow-500 to-amber-500",
    detalhes: {
      oQueFaz: "Envia automaticamente uma mensagem no encerramento da conversa pedindo uma nota de 1 a 5 estrelas ou 0 a 10.",
      beneficio: "Gera estatísticas de desempenho por atendente e identifica falhas no atendimento.",
      simuladorTipo: "nps",
      exemplo: {
        pergunta: "Como você avalia nosso atendimento hoje? (1 a 5)",
        nota: "⭐⭐⭐⭐⭐ (Nota 5/5 recebida)"
      }
    },
    linkRecurso: "/recursos/marketing"
  },
  {
    id: "chat-interno",
    icon: "💼",
    title: "Chat interno da equipe",
    desc: "Combine a resposta com o colega sem sair da plataforma nem abrir outro aplicativo.",
    categoria: "operacao",
    color: "from-cyan-500 to-blue-500",
    detalhes: {
      oQueFaz: "Canal de chat em tempo real entre membros da equipe e grupos de discussão internos.",
      beneficio: "Sem necessidade de usar Telegram ou WhatsApp pessoal para alinhar dúvidas de trabalho.",
      simuladorTipo: "chat",
      exemplo: {
        chat: "Carlos: @Ana você pode verificar a fatura do cliente #402?"
      }
    },
    linkRecurso: "/recursos/automacoes"
  },
  {
    id: "webhooks-api",
    icon: "🔗",
    title: "Webhooks assinados (HMAC) & API REST",
    desc: "Conecte seu CRM e ferramentas com entregas assinadas (HMAC) e retry em fila.",
    categoria: "dev",
    color: "from-rose-500 to-red-500",
    detalhes: {
      oQueFaz: "Dispara eventos HTTP JSON em tempo real para seu sistema quando uma conversa abre, fecha ou recebe mensagem.",
      beneficio: "Integração total com N8N, Make, Zapier, Typebot e CRMs próprios.",
      simuladorTipo: "webhook",
      exemplo: {
        event: "message.created",
        signature: "sha256=a8f93b...",
        status: "200 OK (Entregue)"
      }
    },
    linkRecurso: "/recursos/automacoes"
  }
];

export default function FeatureCards() {
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeModal, setActiveModal] = useState<Feature | null>(null);

  const filteredFeatures = FEATURES.filter((f) => {
    const matchesCat = selectedCategory === "todas" || f.categoria === selectedCategory;
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div>
      {/* Controles de Filtro e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "todas", label: "Todas os Recursos" },
            { id: "ia", label: "✨ Inteligência Artificial" },
            { id: "operacao", label: "💬 Operação & Chat" },
            { id: "disparos", label: "📣 Campanhas & Disparos" },
            { id: "dev", label: "🔗 API & Webhooks" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar recurso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFeatures.map((f) => (
          <div
            key={f.id}
            onClick={() => setActiveModal(f)}
            className="group cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:border-fuchsia-300 relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-2xl shadow-md text-white`}
                >
                  {f.icon}
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 group-hover:bg-fuchsia-50 group-hover:text-fuchsia-600 transition-colors">
                  Clique para detalhes
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 group-hover:text-fuchsia-600 transition-colors">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-fuchsia-600 group-hover:translate-x-1 transition-transform">
              <span>Explorar funcionalidade</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal Interativo de Detalhes da Funcionalidade */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activeModal.color} flex items-center justify-center text-3xl shadow-lg text-white`}
              >
                {activeModal.icon}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-600">
                  Funcionalidade Ativa
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900">{activeModal.title}</h3>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  O que esta funcionalidade faz:
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {activeModal.detalhes.oQueFaz}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                  Benefício Direto para seu Negócio:
                </h4>
                <p className="text-sm text-emerald-900 leading-relaxed font-medium">
                  {activeModal.detalhes.beneficio}
                </p>
              </div>

              {/* Demonstração / Simulador Interativo */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-fuchsia-400 fill-fuchsia-400" />
                    Simulação Interativa em Tempo Real
                  </span>
                  <span className="text-emerald-400">Ativo no Painel</span>
                </div>
                <pre className="text-xs font-mono p-3 rounded-xl bg-slate-950 text-slate-200 overflow-x-auto border border-slate-800 whitespace-pre-wrap">
                  {JSON.stringify(activeModal.detalhes.exemplo, null, 2)}
                </pre>
              </div>

              {/* Ações e Links */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                {activeModal.linkRecurso && (
                  <a
                    href={activeModal.linkRecurso}
                    className="text-xs font-semibold text-fuchsia-600 hover:underline flex items-center gap-1.5"
                  >
                    Ver documentação detalhada <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <a
                  href="http://localhost:8080"
                  target="_blank"
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-fuchsia-500/25 hover:opacity-90 transition-opacity flex items-center gap-2 ml-auto"
                >
                  Testar no Painel Comenta <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
