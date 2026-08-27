import type { Metadata } from "next";
import Link from "next/link";
import { Video, ArrowRight, Play, Sparkles, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Academia Comenta — Cursos & Treinamentos em Vídeo HD",
  description: "Cursos de capacitação em Inteligência Artificial, Atendimento Multicanal, Automações e CRM no WhatsApp.",
};

export default function CursosRedirectPage() {
  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-3xl shadow-xl shadow-purple-600/40 mb-6 animate-pulse">
        🎓
      </div>

      <h1 className="text-3xl sm:text-5xl font-black text-white max-w-2xl">
        Academia Comenta & Player Nativo de Vídeos
      </h1>

      <p className="mt-4 text-slate-300 max-w-lg text-sm sm:text-base leading-relaxed">
        Assista às videoaulas em HD de 1 Minuto com legendas em Português Brasileiro e Player Nativo de alta performance.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <a
          href="http://localhost:8080/cursos"
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-black text-sm shadow-xl shadow-purple-600/30 hover:scale-105 transition-all flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-white" /> Acessar Central de Cursos (Porta 8080) <ArrowRight className="w-4 h-4" />
        </a>

        <Link
          href="/"
          className="px-6 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
