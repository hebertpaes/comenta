import React from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";

const COLUNAS = [
  {
    titulo: "Produto",
    links: [
      { href: "/#recursos", label: "Recursos" },
      { href: "/recursos/whatsapp", label: "WhatsApp" },
      { href: "/recursos/instagram", label: "Instagram" },
      { href: "/recursos/campanhas", label: "Campanhas" },
      { href: "/recursos/robos-ia", label: "Robôs com IA" },
    ],
  },
  {
    titulo: "Empresa",
    links: [
      { href: "/#planos", label: "Planos" },
      { href: "/contato", label: "Contato" },
      { href: "/#faq", label: "Perguntas frequentes" },
    ],
  },
  {
    titulo: "Desenvolvedores",
    links: [
      { href: "/docs", label: "Documentação" },
      { href: "/docs#api", label: "API" },
      { href: "/docs#webhooks", label: "Webhooks" },
      { href: APP_URL, label: "Entrar no painel" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 font-extrabold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white">
                C
              </span>
              Comenta
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              Atendimento multicanal com IA. Todos os seus canais em uma caixa de entrada.
            </p>
          </div>

          {COLUNAS.map((col) => (
            <div key={col.titulo}>
              <div className="text-sm font-bold text-slate-900">{col.titulo}</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <a href={l.href} className="hover:text-slate-900">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-slate-100 pt-6 text-sm text-slate-400">
          © {new Date().getFullYear()} Comenta
        </div>
      </div>
    </footer>
  );
}
