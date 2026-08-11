import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import SiteFooter from "../../components/SiteFooter";
import SiteNav from "../../components/SiteNav";
import { RECURSOS, bySlug } from "../dados";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";

// Páginas estáticas: o conteúdo é fixo, então nada precisa rodar por requisição.
export function generateStaticParams() {
  return RECURSOS.map((r) => ({ slug: r.slug }));
}

// No Next 16 os params chegam como Promise e precisam ser aguardados.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = bySlug(slug);
  if (!r) return { title: "Recurso não encontrado — Comenta" };
  return {
    title: `${r.titulo} — Comenta`,
    description: r.resumo,
    openGraph: { title: `${r.titulo} — Comenta`, description: r.resumo, type: "article" },
  };
}

export default async function RecursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = bySlug(slug);
  if (!r) notFound();

  const outros = RECURSOS.filter((o) => o.slug !== r.slug);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <SiteNav />

      {/* ===== Capa ===== */}
      <section className={`bg-gradient-to-br ${r.gradiente} text-white`}>
        <div className="mx-auto max-w-4xl px-4 py-20 sm:py-24">
          <a href="/#recursos" className="text-sm font-medium text-white/80 hover:text-white">
            ← Todos os recursos
          </a>
          <div className="mt-6 text-5xl">{r.icone}</div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">{r.chamada}</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/90">{r.resumo}</p>
          <a
            href={APP_URL}
            className="mt-8 inline-block rounded-full bg-white px-6 py-3 font-semibold text-slate-900 transition hover:opacity-90"
          >
            Começar grátis
          </a>
        </div>
      </section>

      {/* ===== Blocos ===== */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
        <div className="space-y-12">
          {r.blocos.map((b, i) => (
            <div key={b.titulo} className="flex gap-5">
              <div
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${r.gradiente} font-bold text-white`}
              >
                {i + 1}
              </div>
              <div>
                <h2 className="text-xl font-bold">{b.titulo}</h2>
                <p className="mt-2 leading-relaxed text-slate-600">{b.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Destaques ===== */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="text-2xl font-extrabold">O que vem incluído</h2>
          <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {r.destaques.map((d) => (
              <li key={d} className="flex gap-3 text-slate-700">
                <span className="flex-none text-fuchsia-500">✓</span>
                {d}
              </li>
            ))}
          </ul>

          {r.emBreve && r.emBreve.length > 0 && (
            <>
              <h3 className="mt-12 text-sm font-bold uppercase tracking-wide text-slate-500">
                Ainda não — em breve
              </h3>
              <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {r.emBreve.map((d) => (
                  <li key={d} className="flex gap-3 text-slate-500">
                    <span className="flex-none">○</span>
                    {d}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* ===== Outros recursos ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-extrabold">Veja também</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {outros.map((o) => (
            <a
              key={o.slug}
              href={`/recursos/${o.slug}`}
              className="group rounded-2xl border border-slate-200 p-6 transition hover:border-fuchsia-300 hover:shadow-lg"
            >
              <div className="text-3xl">{o.icone}</div>
              <div className="mt-3 font-bold group-hover:text-fuchsia-600">{o.titulo}</div>
              <p className="mt-1 text-sm text-slate-600">{o.resumo}</p>
            </a>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
