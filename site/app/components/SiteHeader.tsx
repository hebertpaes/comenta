"use client";

// Cabeçalho do site — compartilhado pela home e pelas páginas internas.
// Traz o menu mobile (hambúrguer) que faltava: até então a navegação era
// `hidden md:flex`, ou seja, no celular só sobrava o botão de CTA.
//
// Os links usam caminho absoluto com âncora (`/#recursos`) para funcionarem
// também fora da home (/docs, /termos, /privacidade).

import React, { useEffect, useState } from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";

const LINKS = [
  { href: "/agentes", label: "🤖 Chat Agentes IA" },
  { href: "/loja", label: "🛒 Loja & Cursos" },
  { href: "/#recursos", label: "Recursos" },
  { href: "/#como", label: "Como funciona" },
  { href: "/#canais", label: "Canais" },
  { href: "/#ia", label: "IA" },
  { href: "/#planos", label: "Planos" },
  { href: "/#faq", label: "Dúvidas" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  // Com o menu aberto o fundo não deve rolar — e ESC fecha.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2 font-extrabold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white">
            C
          </span>
          Comenta
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-slate-900">
              {l.label}
            </a>
          ))}
          <a href={APP_URL} className="hover:text-slate-900">
            Entrar
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={APP_URL}
            className="rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:opacity-90"
          >
            Começar grátis
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 lg:hidden"
          >
            <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-2 py-3 text-base font-medium text-slate-700 transition hover:bg-fuchsia-50 hover:text-fuchsia-700"
              >
                {l.label}
              </a>
            ))}
            <a
              href={APP_URL}
              onClick={() => setOpen(false)}
              className="rounded-xl px-2 py-3 text-base font-medium text-slate-700 transition hover:bg-fuchsia-50 hover:text-fuchsia-700"
            >
              Entrar
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
