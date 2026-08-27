import Link from "next/link";
import { ArrowLeft, Home, Sparkles, ShoppingBag, Video, Terminal, Globe, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans flex flex-col items-center justify-center p-6 text-center selection:bg-purple-500 selection:text-white">
      {/* Glow background */}
      <div className="fixed top-1/4 left-1/3 w-[450px] h-[450px] bg-purple-600/20 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-4xl shadow-2xl mb-6">
        🔍
      </div>

      <span className="px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-800/50 text-purple-300 text-xs font-black uppercase tracking-wider mb-4">
        Página não encontrada (404)
      </span>

      <h1 className="text-4xl sm:text-6xl font-black text-white max-w-xl">
        Ops! O endereço acessado não existe.
      </h1>

      <p className="mt-4 text-slate-300 max-w-md text-sm sm:text-base leading-relaxed">
        Navegue pelos links rápidos abaixo para acessar os módulos e sistemas disponíveis:
      </p>

      {/* Grid de Atalhos para todos os módulos */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full text-left">
        <Link
          href="/"
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Site Principal Comenta</div>
            <div className="text-xs text-slate-400">Página inicial da plataforma</div>
          </div>
        </Link>

        <Link
          href="/gumesmomo"
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
            🍬
          </div>
          <div>
            <div className="font-bold text-white text-sm">Gumesmomo.fit</div>
            <div className="text-xs text-slate-400">Gomas de Creatina Fitness</div>
          </div>
        </Link>

        <a
          href="http://localhost:8080"
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
            📱
          </div>
          <div>
            <div className="font-bold text-white text-sm">Painel Comenta (Porta 8080)</div>
            <div className="text-xs text-slate-400">WhatsApp, CRM, IA & Mensagens</div>
          </div>
        </a>

        <a
          href="http://localhost:2368"
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            📰
          </div>
          <div>
            <div className="font-bold text-white text-sm">Notícias USA TODAY (Porta 2368)</div>
            <div className="text-xs text-slate-400">Ghost Tema Hoje MT</div>
          </div>
        </a>
      </div>

      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para a página inicial
        </Link>
      </div>
    </div>
  );
}
