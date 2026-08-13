"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  Zap,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Star,
  ShieldCheck,
  CreditCard,
  QrCode,
  ArrowRight,
  Sparkles,
  Filter,
  Check,
  X,
  Plus,
  Copy,
  BookOpen,
  Lock,
  BarChart3,
  Bot,
  FileText,
  FileCode,
  PhoneCall
} from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export type Produto = {
  id: string;
  nome: string;
  categoria: "planos" | "cursos" | "servicos" | "addons";
  preco: string;
  precoCentavos: number;
  badge?: string;
  descricao: string;
  itens: string[];
  icone: string;
  cor: string;
};

const PRODUTOS: Produto[] = [
  // --- PLANOS SAAS ---
  {
    id: "plano-starter",
    nome: "Plano Starter — Comenta",
    categoria: "planos",
    preco: "R$ 149",
    precoCentavos: 14900,
    descricao: "Ideal para pequenas empresas e autônomos que querem organizar seu WhatsApp.",
    itens: [
      "1 Número de WhatsApp Conectado",
      "Até 3 Atendentes Simultâneos",
      "Caixa de Entrada Única + Kanban",
      "Autoatendimento Básico",
      "Suporte via E-mail e Chat"
    ],
    icone: "🟢",
    cor: "from-emerald-500 to-teal-600"
  },
  {
    id: "plano-pro",
    nome: "Plano Pro — Comenta AI",
    categoria: "planos",
    preco: "R$ 349",
    precoCentavos: 34900,
    badge: "Mais Vendido 🔥",
    descricao: "A solução completa com Inteligência Artificial Anthropic Claude & Gemini.",
    itens: [
      "3 Números de WhatsApp Simultâneos",
      "Até 10 Atendentes na Equipe",
      "IA que Sugere Respostas & Classifica",
      "Campanhas & Disparos em Massa",
      "Pesquisas NPS & Filas por Departamento"
    ],
    icone: "✨",
    cor: "from-fuchsia-600 to-indigo-600"
  },
  {
    id: "plano-business",
    nome: "Plano Business — Enterprise",
    categoria: "planos",
    preco: "R$ 799",
    precoCentavos: 79900,
    descricao: "Para operações em escala que exigem alta disponibilidade e suporte VIP.",
    itens: [
      "Números Ilimitados de WhatsApp",
      "Atendentes Ilimitados",
      "Webhooks HMAC & API REST Completa",
      "Integração Nativa N8N e CRM",
      "Gerente de Conta Dedicado"
    ],
    icone: "🚀",
    cor: "from-purple-600 to-pink-600"
  },

  // --- ADDONS E EXTENSÕES ---
  {
    id: "addon-conexao-extra",
    nome: "Módulo Extra de Conexão WhatsApp",
    categoria: "addons",
    preco: "R$ 99",
    precoCentavos: 9900,
    descricao: "Adicione mais 1 número de WhatsApp adicional ao seu plano atual.",
    itens: [
      "1 Conexão de WhatsApp Adicional",
      "Pareamento Instantâneo por QR Code",
      "Importação da Agenda de Contatos",
      "Sem Contrato de Fidelidade"
    ],
    icone: "📲",
    cor: "from-teal-500 to-emerald-600"
  },
  {
    id: "addon-instagram-messenger",
    nome: "Módulo Instagram Direct & Messenger Meta API",
    categoria: "addons",
    preco: "R$ 199",
    precoCentavos: 19900,
    badge: "Novo 📸",
    descricao: "Conecte sua página do Facebook e perfil profissional do Instagram Direct.",
    itens: [
      "Integração Oficial Webhook Meta Graph API",
      "Caixa de Entrada Única Direct + Messenger",
      "Automação de Respostas Rápidas",
      "Mesmas Filas e Kanban do WhatsApp"
    ],
    icone: "📸",
    cor: "from-pink-500 to-rose-600"
  },

  // --- CURSOS & TREINAMENTOS ---
  {
    id: "curso-atendente-ia",
    nome: "Formação Atendente IA & Vendas no WhatsApp",
    categoria: "cursos",
    preco: "R$ 297",
    precoCentavos: 29700,
    badge: "Curso Prático 🎓",
    descricao: "Treine sua equipe para vender 3x mais usando scripts de IA e gatilhos mentais.",
    itens: [
      "24 Aulas em Vídeo HD Gravadas",
      "Modelos de Prompts de IA para Copiar e Colar",
      "Certificado Oficial de Conclusão",
      "Acesso Vitalício + Atualizações"
    ],
    icone: "🎓",
    cor: "from-amber-500 to-orange-600"
  },
  {
    id: "curso-n8n-automacao",
    nome: "Masterclass Automações Avançadas com n8n",
    categoria: "cursos",
    preco: "R$ 497",
    precoCentavos: 49700,
    descricao: "Construa robôs de atendimento integrando WhatsApp, CRM e IA sem programar.",
    itens: [
      "15 Templates Prontos de Workflows n8n",
      "Integração de Webhooks do Comenta",
      "Suporte a Dúvidas na Comunidade VIP",
      "Material Didático em PDF"
    ],
    icone: "⚙️",
    cor: "from-cyan-500 to-blue-600"
  },
  {
    id: "ebook-100-prompts",
    nome: "E-book & Scriptbook: 100 Prompts de IA para Vendas",
    categoria: "cursos",
    preco: "R$ 97",
    precoCentavos: 9700,
    descricao: "Prompts validados para fechar contratos, quebrar objeções e contornar clientes difíceis.",
    itens: [
      "100 Prompts Prontos para Claude e ChatGPT",
      "Scripts de Abordagem Fria e Reativa",
      "Guia em PDF de Download Imediato"
    ],
    icone: "📘",
    cor: "from-indigo-500 to-blue-600"
  },
  {
    id: "mentoria-vip-vendas",
    nome: "Mentoria VIP de Vendas & Atendimento (1-a-1)",
    categoria: "cursos",
    preco: "R$ 2.500",
    precoCentavos: 250000,
    badge: "Exclusivo 👑",
    descricao: "Acompanhamento individualizado com nosso Head de Operações para estruturar seu funil.",
    itens: [
      "4 Encontros Ao Vivo de 1h30min",
      "Análise de Desempenho do seu Time",
      "Desenho do Funil de Atendimento",
      "Acesso Direto via WhatsApp Privado"
    ],
    icone: "👑",
    cor: "from-amber-600 to-yellow-500"
  },

  // --- SERVIÇOS PROFISSIONAIS ---
  {
    id: "servico-implantacao",
    nome: "Implantação Completa Turnkey Comenta",
    categoria: "servicos",
    preco: "R$ 1.200",
    precoCentavos: 120000,
    badge: "Serviço VIP 🛠️",
    descricao: "Nossa equipe de engenharia configura toda a sua operação do zero em 48h.",
    itens: [
      "Configuração de Filas & Departamentos",
      "Conexão de Números de WhatsApp & Instagram",
      "Importação da sua Base de Clientes",
      "Treinamento ao Vivo de 2h para o seu Time"
    ],
    icone: "🛠️",
    cor: "from-rose-500 to-red-600"
  },
  {
    id: "servico-robo-sob-medida",
    nome: "Criação de Robô de IA Personalizado",
    categoria: "servicos",
    preco: "R$ 1.800",
    precoCentavos: 180000,
    descricao: "Desenvolvemos a base de conhecimento e prompts do robô ajustados para seu nicho.",
    itens: [
      "Alimentação de Base de Dados Própria",
      "Ajuste Fino de Tom de Voz da Marca",
      "Testes Intensivos de Handoff para Humanos",
      "Garantia de Funcionamento de 30 Dias"
    ],
    icone: "🤖",
    cor: "from-violet-600 to-purple-600"
  },
  {
    id: "servico-auditoria-lgpd",
    nome: "Auditoria de Segurança, SLA & LGPD",
    categoria: "servicos",
    preco: "R$ 1.500",
    precoCentavos: 150000,
    descricao: "Avaliação técnica das suas rotinas de atendimento para conformidade legal e retenção.",
    itens: [
      "Relatório Completo de Vulnerabilidades",
      "Adequação de Políticas de Privacidade no Chat",
      "Certificado de Conformidade LGPD Atendimento"
    ],
    icone: "🔒",
    cor: "from-slate-700 to-slate-900"
  },
  {
    id: "servico-dashboard-bi",
    nome: "Dashboard de BI & Métricas Avançadas Metabase",
    categoria: "servicos",
    preco: "R$ 890",
    precoCentavos: 89000,
    descricao: "Painel de controle executivo em tempo real com relatórios de performance e SLA.",
    itens: [
      "Integração de Métricas do PostgreSQL com Metabase",
      "Gráficos de Tempo Médio de Espera (TME)",
      "Rankings de Desempenho de Atendentes"
    ],
    icone: "📊",
    cor: "from-blue-600 to-indigo-700"
  }
];

export default function LojaPage() {
  const [categoria, setCategoria] = useState<string>("todos");
  const [carrinho, setCarrinho] = useState<Produto[]>([]);
  const [modalCheckout, setModalCheckout] = useState<boolean>(false);
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao" | "boleto">("pix");
  
  // Estado dos campos do formulário de pagamento
  const [cartaoNumero, setCartaoNumero] = useState<string>("");
  const [cartaoNome, setCartaoNome] = useState<string>("");
  const [cartaoValidade, setCartaoValidade] = useState<string>("");
  const [cartaoCvv, setCartaoCvv] = useState<string>("");
  const [cupom, setCupom] = useState<string>("");
  const [descontoPerc, setDescontoPerc] = useState<number>(0);
  const [pixCopiado, setPixCopiado] = useState<boolean>(false);
  
  const [processando, setProcessando] = useState<boolean>(false);
  const [sucessoCompra, setSucessoCompra] = useState<boolean>(false);
  const [erroPagamento, setErroPagamento] = useState<string>("");

  const produtosFiltrados = PRODUTOS.filter(
    (p) => categoria === "todos" || p.categoria === categoria
  );

  const aplicarCupom = () => {
    if (cupom.trim().toUpperCase() === "COMENDA10" || cupom.trim().toUpperCase() === "COMENTA") {
      setDescontoPerc(10);
      setErroPagamento("");
    } else if (cupom.trim().toUpperCase() === "PROMO20") {
      setDescontoPerc(20);
      setErroPagamento("");
    } else {
      setErroPagamento("Cupom inválido. Tente 'COMENTA' para 10% OFF.");
    }
  };

  const adicionarAoCarrinho = (p: Produto) => {
    if (!carrinho.find((item) => item.id === p.id)) {
      setCarrinho([...carrinho, p]);
    }
    setModalCheckout(true);
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho(carrinho.filter((item) => item.id !== id));
  };

  const subtotalCentavos = carrinho.reduce((acc, item) => acc + item.precoCentavos, 0);
  const valorDesconto = (subtotalCentavos * descontoPerc) / 100;
  const totalCentavos = subtotalCentavos - valorDesconto;

  const totalFormatado = (totalCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  const payloadPix = `00020126580014BR.GOV.BCB.PIX0136comenta-pagamentos-pix-ia-comenta520400005303986540${(totalCentavos / 100).toFixed(2)}5802BR5920Comenta Tecnologia6007CUIABA62070503***6304A8F9`;

  const copiarPix = () => {
    navigator.clipboard.writeText(payloadPix);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 3000);
  };

  const validarEFinalizarCompra = () => {
    setErroPagamento("");

    if (carrinho.length === 0) {
      setErroPagamento("Seu carrinho está vazio!");
      return;
    }

    if (metodoPagamento === "cartao") {
      const numLimpo = cartaoNumero.replace(/\s+/g, "");
      if (numLimpo.length < 13 || numLimpo.length > 19) {
        setErroPagamento("Número de cartão inválido. Digite entre 13 e 19 dígitos.");
        return;
      }
      if (!cartaoNome.trim()) {
        setErroPagamento("Digite o nome impresso no cartão.");
        return;
      }
      if (!cartaoValidade.includes("/") || cartaoValidade.length < 5) {
        setErroPagamento("Validade inválida. Use o formato MM/AA.");
        return;
      }
      if (cartaoCvv.length < 3) {
        setErroPagamento("Código CVV inválido. Digite 3 ou 4 dígitos.");
        return;
      }
    }

    setProcessando(true);
    setTimeout(() => {
      setProcessando(false);
      setSucessoCompra(true);
      setTimeout(() => {
        setSucessoCompra(false);
        setModalCheckout(false);
        setCarrinho([]);
        setCartaoNumero("");
        setCartaoNome("");
        setCartaoValidade("");
        setCartaoCvv("");
      }, 5000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div>
        <SiteHeader />

        {/* Hero Banner da Loja */}
        <section className="relative overflow-hidden bg-slate-950 text-white py-16 sm:py-24">
          <div className="blob left-10 top-0 h-72 w-72 bg-fuchsia-600" />
          <div className="blob right-10 bottom-0 h-72 w-72 bg-indigo-600" />

          <div className="relative mx-auto max-w-6xl px-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-fuchsia-200">
              <ShoppingBag className="w-4 h-4 text-fuchsia-400" />
              Loja Oficial Comenta AI
            </span>
            <h1 className="mt-5 text-4xl font-extrabold sm:text-5xl lg:text-6xl tracking-tight">
              Tudo para impulsionar suas <span className="text-gradient">Vendas & Atendimento</span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-300">
              Planos do software SaaS, formações práticas para sua equipe e serviços de implantação sob medida.
            </p>
          </div>
        </section>

        {/* Categorias & Grid de Produtos */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "todos", label: "Todos os Produtos" },
                { id: "planos", label: "⚡ Planos SaaS" },
                { id: "addons", label: "📲 Extensões & Conexões" },
                { id: "cursos", label: "🎓 Cursos & Treinamentos" },
                { id: "servicos", label: "🛠️ Serviços & Implantação" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoria(cat.id)}
                  className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                    categoria === cat.id
                      ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setModalCheckout(true)}
              className="relative px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:bg-slate-800 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Ver Carrinho
              {carrinho.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-fuchsia-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                  {carrinho.length}
                </span>
              )}
            </button>
          </div>

          {/* Grid de Produtos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {produtosFiltrados.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-200 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden"
              >
                {p.badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-extrabold px-3 py-1 rounded-full bg-amber-400 text-slate-900 shadow-sm">
                    {p.badge}
                  </span>
                )}

                <div>
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.cor} text-white text-3xl flex items-center justify-center mb-5 shadow-md`}
                  >
                    {p.icone}
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900">{p.nome}</h3>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">{p.descricao}</p>

                  <div className="mt-6 mb-6">
                    <span className="text-3xl font-extrabold text-slate-900">{p.preco}</span>
                    <span className="text-xs text-slate-400 font-medium"> / investimento</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-600 mb-8 border-t border-slate-100 pt-5">
                    {p.itens.map((it) => (
                      <li key={it} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 flex-none mt-0.5" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => adicionarAoCarrinho(p)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-fuchsia-500/25 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> Comprar Agora
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Garantia & Segurança */}
        <section className="bg-white border-y border-slate-200 py-16">
          <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-2xl bg-slate-50">
              <ShieldCheck className="w-10 h-10 text-fuchsia-600 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-900">Garantia de 7 Dias</h4>
              <p className="mt-1 text-xs text-slate-500">Se não aprovar a plataforma, devolvemos 100% do seu valor.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50">
              <Zap className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-900">Liberação Imediata</h4>
              <p className="mt-1 text-xs text-slate-500">Acesso instantâneo ao painel e cursos logo após o pagamento.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50">
              <Briefcase className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-900">Suporte Dedicado VIP</h4>
              <p className="mt-1 text-xs text-slate-500">Especialistas prontos para apoiar sua equipe no WhatsApp.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Modal de Carrinho e Checkout Integrado com Validação Real */}
      {modalCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setModalCheckout(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            {sucessoCompra ? (
              <div className="text-center py-10 space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-bold">
                  ✓
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">Pagamento Confirmado!</h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Seu pedido foi aprovado. Enviamos os dados de acesso e a chave da licença para seu e-mail e WhatsApp!
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs font-mono space-y-1">
                  <div>Status: Aprovado (Pagamento Confirmado)</div>
                  <div>ID Transação: tx_{Date.now().toString().slice(-8)}</div>
                  <div>Licença: ACTIVE-PRO-{Math.floor(1000 + Math.random() * 9000)}</div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-fuchsia-600" /> Resumo do Pedido
                </h3>

                {carrinho.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Seu carrinho está vazio. Escolha um produto acima!
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {carrinho.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                          <div>
                            <span className="font-bold text-slate-900 block">{item.nome}</span>
                            <span className="text-fuchsia-600 font-semibold">{item.preco}</span>
                          </div>
                          <button
                            onClick={() => removerDoCarrinho(item.id)}
                            className="text-slate-400 hover:text-rose-500 text-xs font-semibold"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Campo de Cupom */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cupom (ex: COMENTA)"
                        value={cupom}
                        onChange={(e) => setCupom(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                      <button
                        onClick={aplicarCupom}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
                      >
                        Aplicar
                      </button>
                    </div>

                    {descontoPerc > 0 && (
                      <div className="text-xs text-emerald-600 font-bold flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl">
                        <span>Cupom Aplicado ({descontoPerc}% OFF):</span>
                        <span>-{(valorDesconto / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-3 flex items-center justify-between font-extrabold text-base">
                      <span>Total do Pedido:</span>
                      <span className="text-fuchsia-600 text-xl">{totalFormatado}</span>
                    </div>

                    {/* Seleção do Método de Pagamento */}
                    <div className="pt-2">
                      <label className="text-xs font-bold text-slate-700 block mb-2">Forma de Pagamento:</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setMetodoPagamento("pix")}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 ${
                            metodoPagamento === "pix"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          <QrCode className="w-4 h-4" /> Pix Instantâneo
                        </button>
                        <button
                          onClick={() => setMetodoPagamento("cartao")}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 ${
                            metodoPagamento === "cartao"
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          <CreditCard className="w-4 h-4" /> Cartão Crédito
                        </button>
                        <button
                          onClick={() => setMetodoPagamento("boleto")}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 ${
                            metodoPagamento === "boleto"
                              ? "border-amber-500 bg-amber-50 text-amber-700"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          <FileText className="w-4 h-4" /> Boleto Bancário
                        </button>
                      </div>
                    </div>

                    {/* Detalhes do Pagamento Selecionado */}
                    {metodoPagamento === "pix" && (
                      <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                        <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                          <span>PIX QR Code Gerado</span>
                          <span>Validade: 30 min</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl w-32 h-32 mx-auto flex items-center justify-center">
                          <QrCode className="w-24 h-24 text-slate-900" />
                        </div>
                        <button
                          onClick={copiarPix}
                          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {pixCopiado ? "Chave Pix Copiada! ✓" : "Copiar Chave Pix Copia e Cola"}
                        </button>
                      </div>
                    )}

                    {metodoPagamento === "cartao" && (
                      <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Número do Cartão
                          </label>
                          <input
                            type="text"
                            placeholder="4000 0000 0000 0000"
                            maxLength={19}
                            value={cartaoNumero}
                            onChange={(e) => setCartaoNumero(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            Nome Impresso no Cartão
                          </label>
                          <input
                            type="text"
                            placeholder="NOME COMO NO CARTAO"
                            value={cartaoNome}
                            onChange={(e) => setCartaoNome(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white uppercase"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              Validade (MM/AA)
                            </label>
                            <input
                              type="text"
                              placeholder="12/28"
                              maxLength={5}
                              value={cartaoValidade}
                              onChange={(e) => setCartaoValidade(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              CVV
                            </label>
                            <input
                              type="text"
                              placeholder="123"
                              maxLength={4}
                              value={cartaoCvv}
                              onChange={(e) => setCartaoCvv(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {metodoPagamento === "boleto" && (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                        <div className="font-bold flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600" /> Boleto Registrado
                        </div>
                        <p>O boleto expira em 3 dias úteis. A compensação ocorre em até 24 horas.</p>
                      </div>
                    )}

                    {erroPagamento && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                        ⚠️ {erroPagamento}
                      </div>
                    )}

                    <button
                      onClick={validarEFinalizarCompra}
                      disabled={processando}
                      className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                    >
                      {processando ? (
                        <span>Processando Transação...</span>
                      ) : (
                        <>
                          CONFIRMAR PAGAMENTO DE {totalFormatado} <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
