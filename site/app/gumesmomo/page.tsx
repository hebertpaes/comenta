import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Bot, ShieldCheck, Zap, ArrowRight, Play, CheckCircle2, MessageSquare, Phone, Globe, Star, Video, ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Gumesmomo — Inteligência Artificial, CRM & Atendimento Multicanal",
  description: "Portal Oficial Gumesmomo (gumesmomo.com.br). Plataforma completa de automação de atendimento via WhatsApp, IA Generativa Google Gemini, CRM Kanban e ERP.",
};

export default function GumesmomoPage() {
  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans selection:bg-fuchsia-500 selection:text-white">
      {/* Background Decorative Glow Blobs */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090a0f]/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/gumesmomo" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-fuchsia-600/30 group-hover:scale-105 transition-transform">
              G
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-fuchsia-400">
                gumesmomo<span className="text-fuchsia-500">.com.br</span>
              </span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Plataforma Oficial IA & CRM
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <Link href="/" className="hover:text-fuchsia-400 transition-colors">
              Início
            </Link>
            <Link href="/agentes" className="hover:text-fuchsia-400 transition-colors flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" /> Agentes IA
            </Link>
            <Link href="/loja" className="hover:text-fuchsia-400 transition-colors flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-400" /> Loja & Planos
            </Link>
            <a
              href="http://localhost:8080/cursos"
              target="_blank"
              rel="noreferrer"
              className="hover:text-fuchsia-400 transition-colors flex items-center gap-1.5"
            >
              <Video className="w-4 h-4 text-indigo-400" /> Cursos HD
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="http://localhost:8080"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-fuchsia-600/30 hover:opacity-95 transition-all flex items-center gap-2"
            >
              Acessar Painel <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-950/80 border border-fuchsia-800/50 text-fuchsia-300 text-xs font-bold mb-8 shadow-inner">
          <Globe className="w-4 h-4 text-fuchsia-400" /> Domínio Oficial: gumesmomo.com.br
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight max-w-5xl mx-auto">
          Transforme seu atendimento com <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-indigo-300 to-emerald-400">
            Inteligência Artificial & CRM
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Atenda seus clientes 24 horas por dia no WhatsApp, qualifique leads automaticamente com a IA Sofia Google Gemini e organize sua operação no Kanban e ERP Financeiro.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-black text-sm shadow-xl shadow-fuchsia-600/30 hover:scale-105 transition-all flex items-center gap-2"
          >
            🚀 Começar Agora no Gumesmomo <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="http://localhost:8080/cursos"
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Play className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400" /> Ver Treinamentos em Vídeo
          </a>
        </div>

        {/* MOCKUP / DASHBOARD PREVIEW */}
        <div className="mt-16 relative mx-auto max-w-5xl rounded-3xl overflow-hidden border border-slate-800 bg-slate-950/80 shadow-2xl shadow-fuchsia-950/50 p-4 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-2 font-bold text-slate-300">gumesmomo.com.br — Painel de Controle</span>
            </div>
            <span className="text-emerald-400 font-bold">🟢 IA Google Gemini 2.0 Ativa</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 text-left">
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-600/20 text-fuchsia-400 flex items-center justify-center font-bold mb-4">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Sofia IA Autônoma</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Responde dúvidas de produtos, envia preços e qualifica clientes no WhatsApp sem intervenção humana.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Caixa de Entrada Única</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Centralize múltiplos números de WhatsApp, Instagram Direct e WebChat em uma única tela organizada.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">CRM & ERP Financeiro</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Acompanhe o funil no Kanban, emita cobranças automatizadas e meça a satisfação (NPS) da equipe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS PRINCIPAIS */}
      <section className="py-20 bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest">
              Por que escolher o gumesmomo.com.br?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              Tudo o que sua empresa precisa para escalar vendas
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-fuchsia-500/50 transition-all">
              <CheckCircle2 className="w-8 h-8 text-fuchsia-400 mb-4" />
              <h4 className="font-bold text-white text-lg">Respostas em 10 Segundos</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Zero tempo de espera. Seus clientes recebem atendimento imediato 24/7.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-fuchsia-500/50 transition-all">
              <Zap className="w-8 h-8 text-indigo-400 mb-4" />
              <h4 className="font-bold text-white text-lg">Disparos Anti-Bloqueio</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Campanhas em massa com ritmo humano e intervalos seguros entre enviadores.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-fuchsia-500/50 transition-all">
              <Star className="w-8 h-8 text-yellow-400 mb-4" />
              <h4 className="font-bold text-white text-lg">Player Nativo de Cursos</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Videoaulas em HD com legendas em PT-BR e player 100% responsivo.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-fuchsia-500/50 transition-all">
              <Phone className="w-8 h-8 text-emerald-400 mb-4" />
              <h4 className="font-bold text-white text-lg">Menu no WhatsApp</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Form Builder editável para criar menus interativos de atendimento em tempo real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-fuchsia-600 text-white font-bold flex items-center justify-center">
              G
            </div>
            <span className="font-bold text-slate-200">gumesmomo.com.br</span>
            <span>© 2026 Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">Início</Link>
            <Link href="/loja" className="hover:text-white transition-colors">Loja</Link>
            <Link href="/agentes" className="hover:text-white transition-colors">Agentes IA</Link>
            <a href="http://localhost:8080" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Painel</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
