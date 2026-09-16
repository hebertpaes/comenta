import type { Metadata } from "next";
import React from "react";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import { RECURSOS } from "./dados";

export const metadata: Metadata = {
  title: "Recursos — Comenta",
  description:
    "WhatsApp, Instagram, campanhas com disparo em massa, robôs de autoatendimento com IA, marketing e automações — o que o Comenta faz, em detalhe.",
};

export default function RecursosIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <SiteNav />

      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Tudo que o <span className="text-gradient">Comenta</span> faz
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Cada página descreve o recurso como ele funciona hoje — sem promessa que o produto não
            paga.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map((r) => (
            <a
              key={r.slug}
              href={`/recursos/${r.slug}`}
              className="group flex flex-col rounded-3xl border border-slate-200 p-7 transition hover:-translate-y-1 hover:border-fuchsia-300 hover:shadow-xl"
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${r.gradiente} text-2xl`}
              >
                {r.icone}
              </div>
              <h2 className="mt-5 text-lg font-bold group-hover:text-fuchsia-600">{r.titulo}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{r.resumo}</p>
              <span className="mt-5 text-sm font-semibold text-fuchsia-600">Ver detalhes →</span>
            </a>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
