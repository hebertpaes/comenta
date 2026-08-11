import React from "react";

/**
 * Barra de navegação compartilhada.
 *
 * Os links de seção apontam para `/#ancora`, não `#ancora`: as páginas novas
 * (/docs, /contato, /recursos/*) não têm essas seções, e um href relativo ali
 * viraria um clique que não faz nada.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";

const LINKS = [
  { href: "/#recursos", label: "Recursos" },
  { href: "/#canais", label: "Canais" },
  { href: "/#ia", label: "IA" },
  { href: "/#planos", label: "Planos" },
  { href: "/docs", label: "Docs" },
  { href: "/contato", label: "Contato" },
];

export default function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2 text-lg font-extrabold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white">
            C
          </span>
          Comenta
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-slate-900">
              {l.label}
            </a>
          ))}
          <a href={APP_URL} className="hover:text-slate-900">
            Entrar
          </a>
        </nav>
        <a
          href={APP_URL}
          className="rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Começar grátis
        </a>
      </div>
    </header>
  );
}
