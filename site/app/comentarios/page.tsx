import React from "react";
import Metadata from "next";
import Link from "next/link";
import ComentaWidget from "../components/ComentaWidget";
import { MessageSquare, ShieldCheck, Sparkles, Code, Terminal, Bot } from "lucide-react";

export const metadata = {
  title: "Sistema Comenta Native — Moderação Instantânea com TypeSafe Jev & Gemini 2.0",
  description: "Sistema próprio de comentários com inteligência artificial para blogs, portais e e-commerce. Moderação em tempo real, respostas automáticas e análise de sentimento.",
};

export default function ComentariosPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white">
              C
            </span>
            Comenta <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-400 font-bold border border-fuchsia-500/30">NATIVE</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-400 sm:flex">
            <Link href="/" className="hover:text-white transition-colors">Início</Link>
            <Link href="/preview" className="hover:text-white transition-colors">🤖 Chat Agentes IA</Link>
            <Link href="/gumesmomo" className="hover:text-white transition-colors">🍬 Loja Gumesmomo</Link>
            <Link href="/ghost" className="hover:text-white transition-colors">👻 Ghost CMS</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-fuchsia-500/25 hover:opacity-90">
              Acessar Plataforma
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-900/50 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/10 px-4 py-1.5 text-xs font-bold text-fuchsia-400 border border-fuchsia-500/20">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            Sistema Próprio de Comentários & Moderação por IA
          </span>

          <h1 className="mt-4 text-3xl font-black sm:text-5xl tracking-tight text-white">
            Sistema <span className="bg-gradient-to-r from-fuchsia-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">Comenta Native</span> para Web
          </h1>

          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-400">
            Substitua widgets genéricos por uma experiência própria de comentários alimentada pelos modelos System One **TypeSafe AI Jev** e **Google Gemini 2.0 Flash**.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Moderação em 70ms</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Resposta Automática da IA</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <Code className="w-4 h-4 text-indigo-400" />
              <span>Embed Simples via Componente React</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Widget Container */}
      <main className="mx-auto max-w-6xl px-4 py-12 flex-1 w-full">
        <ComentaWidget />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Comenta Native System • Desenvolvido pela Equipe IntSoft & Comenta AI</p>
      </footer>
    </div>
  );
}
