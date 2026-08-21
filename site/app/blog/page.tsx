import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Sparkles, Clock, ArrowRight, User, Tag, Terminal, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog & Publicações Ghost CMS — Comenta & Gumesmomo Fit",
  description: "Artigos, tutoriais de Ghost CMS local, automações no WhatsApp, IA Generativa Google Gemini e Nutrição Esportiva.",
};

const POSTS = [
  {
    id: "ghost-1",
    title: "Como Criar uma Empresa de Suplementação Esportiva e Escalar Vendas no WhatsApp com IA",
    slug: "como-criar-empresa-suplementacao-gomas-creatina-ia",
    excerpt: "Descubra como a inovação em gomas de creatina aliada ao atendimento por IA no WhatsApp está revolucionando as vendas de suplementos no Brasil.",
    feature_image: "/images/gumesmomo_jar.jpg",
    published_at: "21 de Agosto de 2026",
    reading_time: 4,
    author: "Dr. Gabriel Santos",
    author_role: "Nutricionista Esportivo",
    tag: "Nutrição & IA",
  },
  {
    id: "ghost-2",
    title: "Guia Definitivo do Ghost CMS: Como Configurar Localmente e Integrar ao Next.js",
    slug: "guia-definitivo-ghost-cms-instalacao-local-nextjs",
    excerpt: "Aprenda a instalar o Ghost CMS na sua estrutura local e conectar a API de conteúdo Headless ao seu site Next.js.",
    feature_image: "/images/gumesmomo_hand.jpg",
    published_at: "21 de Agosto de 2026",
    reading_time: 3,
    author: "Engenharia Comenta",
    author_role: "Core Team",
    tag: "Ghost CMS",
  },
];

export default function GhostBlogPage() {
  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans selection:bg-purple-500 selection:text-white">
      {/* Background Decorative Glow Blobs */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090a0f]/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purple-600/30">
              👻
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">
                GHOST<span className="text-purple-400">.BLOG</span>
              </span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Ghost CMS Headless Local • Comenta
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <a
              href="http://localhost:2368/ghost"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2 rounded-full bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs hover:border-purple-500 transition-all flex items-center gap-2"
            >
              <Terminal className="w-4 h-4 text-purple-400" /> Painel Admin Ghost <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-950/80 border border-purple-800/50 text-purple-300 text-xs font-black mb-8 shadow-inner">
          <Sparkles className="w-4 h-4 text-purple-400" /> Ghost CMS 5.88.0 • Content API v5 Integrado
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
          Publicações & Artigos <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-emerald-400">
            Inteligência Artificial, Nutrição & Tecnologia
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Conteúdo oficial gerenciado pelo Ghost CMS local e renderizado com máxima performance e SEO no Next.js.
        </p>

        {/* INSTALAÇÃO LOCAL DO GHOST CLI INFO CARD */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-950/80 border border-slate-800 max-w-3xl mx-auto text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Comandos Ghost CLI Local (docs.ghost.org)
            </span>
            <span className="text-[11px] bg-purple-950 text-purple-300 px-2.5 py-1 rounded-md font-mono border border-purple-800">
              http://localhost:2368
            </span>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl font-mono text-xs text-slate-200 space-y-2 overflow-x-auto">
            <div><span className="text-purple-400">$</span> npm install -g ghost-cli@latest</div>
            <div><span className="text-purple-400">$</span> ghost install local</div>
            <div><span className="text-emerald-400">✔ Ghost instalado e rodando em http://localhost:2368</span></div>
          </div>
        </div>
      </section>

      {/* LISTA DE POSTS DO BLOG GHOST */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {POSTS.map((post) => (
            <article
              key={post.id}
              className="rounded-3xl bg-slate-950/90 border border-slate-800 overflow-hidden hover:border-purple-500/50 transition-all flex flex-col justify-between group shadow-xl"
            >
              <div>
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={post.feature_image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md text-purple-400 font-black text-xs border border-purple-500/40">
                      {post.tag}
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-3 font-medium">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-purple-400" /> {post.reading_time} min de leitura</span>
                    <span>•</span>
                    <span>{post.published_at}</span>
                  </div>

                  <h2 className="text-2xl font-black text-white group-hover:text-purple-400 transition-colors leading-snug">
                    {post.title}
                  </h2>

                  <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="px-8 pb-8 flex items-center justify-between border-t border-slate-900 pt-4">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>{post.author}</span>
                </div>

                <span className="text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Ler Artigo <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-12 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>👻</span>
            <span className="font-extrabold text-white">Ghost CMS Headless Local</span>
            <span>© 2026 Comenta & Gumesmomo Fit</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">Início</Link>
            <Link href="/gumesmomo" className="hover:text-white transition-colors">Gumesmomo Fit</Link>
            <a href="http://localhost:2368/ghost" target="_blank" rel="noreferrer" className="hover:text-purple-400 transition-colors">Ghost Admin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
