import type { Metadata } from "next";
import React from "react";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import { PLANOS } from "../lib/plans";

/**
 * Página institucional da IntSoft (intsoft.com.br) — a empresa que constrói e
 * opera o Comenta.
 *
 * Respondida em /intsoft, em /intsoft.com.br e, quando o host é intsoft.com.br,
 * também na raiz (rewrite em next.config.js): o mesmo deploy do site atende
 * comenta.com.br e intsoft.com.br.
 *
 * O foco é o Comenta. A IntSoft aparece como quem faz o produto, e todos os
 * CTAs levam para o site ou para o painel do Comenta.
 */

export const metadata: Metadata = {
  title: "IntSoft — Engenharia de software e IA por trás do Comenta | intsoft.com.br",
  description:
    "A IntSoft constrói o Comenta: atendimento multicanal com IA para WhatsApp, Instagram, Messenger e chat do site. Engenharia de software, agentes de IA e automação de WhatsApp.",
  openGraph: {
    title: "IntSoft — a empresa por trás do Comenta",
    description:
      "Engenharia de software, agentes de IA e automação de WhatsApp. O Comenta é o nosso produto principal.",
    type: "website",
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";

// Frentes de trabalho da IntSoft. Cada uma aponta onde aparece no Comenta —
// a página é sobre a empresa, mas quem chega aqui quer saber o que ela entrega.
const FRENTES = [
  {
    icon: "🧠",
    titulo: "Agentes de IA",
    desc: "Modelos de linguagem aplicados ao atendimento: classificam, resumem, sugerem e respondem sozinhos quando a conversa é simples.",
    noComenta: "IA que responde por você",
    color: "from-violet-500 to-indigo-500",
  },
  {
    icon: "🟢",
    titulo: "Automação de WhatsApp",
    desc: "Vários números na mesma caixa de entrada, filas por setor, campanhas e fluxos automáticos sem depender de aprovação da Meta.",
    noComenta: "Conexões e FlowBuilder",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: "🛠️",
    titulo: "Engenharia de software",
    desc: "API multi-tenant, painel em tempo real, app iOS e webhooks assinados. Código próprio, deploy automatizado e monitorado.",
    noComenta: "API REST, webhooks e app",
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: "🛰️",
    titulo: "Geomonitoramento em tempo real",
    desc: "Painéis com câmeras, radares e telemetria de frota, integrados ao mesmo atendimento que fala com o cliente.",
    noComenta: "Integrações e automações",
    color: "from-amber-500 to-orange-500",
  },
];

// O que o Comenta entrega hoje — mesma regra da home: só o que já funciona.
const ENTREGAS = [
  "Caixa de entrada única para todos os canais",
  "IA que classifica, resume e sugere respostas",
  "Autoatendimento com transferência para uma pessoa",
  "Filas, tags, respostas rápidas e Kanban",
  "Campanhas, automações e FlowBuilder",
  "API REST, webhooks assinados e app iOS",
];

const CANAIS = [
  { icon: "🟢", nome: "WhatsApp" },
  { icon: "📸", nome: "Instagram Direct" },
  { icon: "💬", nome: "Facebook Messenger" },
  { icon: "🌐", nome: "Chat do site" },
];

const NUMEROS = [
  { valor: "4", rotulo: "canais prontos para usar" },
  { valor: "24/7", rotulo: "atendimento com IA" },
  { valor: "99,9%", rotulo: "de disponibilidade" },
];

export default function IntSoftPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <SiteNav />

      {/* ===== Hero ===== */}
      <section className="relative">
        <div className="blob left-[-6rem] top-[-4rem] h-72 w-72 bg-indigo-400" />
        <div
          className="blob right-[-5rem] top-10 h-80 w-80 bg-fuchsia-400"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="blob left-1/3 top-40 h-72 w-72 bg-sky-300"
          style={{ animationDelay: "-8s" }}
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              IntSoft · intsoft.com.br · a empresa por trás do Comenta
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Software, IA e automação{" "}
              <span className="text-gradient">feitos para atender melhor</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              A IntSoft projeta, constrói e opera o Comenta: a plataforma que reúne WhatsApp,
              Instagram, Messenger e chat do site em uma caixa de entrada, com IA que responde por
              você.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={APP_URL}
                className="rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-6 py-3 text-center font-semibold text-white shadow-xl shadow-fuchsia-500/30 transition hover:opacity-90"
              >
                Começar grátis no Comenta
              </a>
              <a
                href="/"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Conhecer o Comenta
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Sem cartão de crédito · Configure em minutos
            </p>
          </div>

          <ProdutoCard />
        </div>
      </section>

      {/* ===== Números ===== */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 text-center sm:grid-cols-3">
          {NUMEROS.map((n) => (
            <div key={n.rotulo}>
              <div className="text-gradient text-4xl font-extrabold">{n.valor}</div>
              <div className="mt-1 text-sm text-slate-600">{n.rotulo}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== O que a IntSoft faz ===== */}
      <section id="frentes" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-600">
            O que a IntSoft faz
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Quatro frentes, um produto no centro
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Tudo o que a IntSoft desenvolve entra no Comenta. Não há projeto de gaveta: o que está
            aqui é o que roda no produto.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {FRENTES.map((f) => (
            <div
              key={f.titulo}
              className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-2xl text-white shadow-lg`}
              >
                {f.icon}
              </div>
              <h3 className="mt-5 text-xl font-bold">{f.titulo}</h3>
              <p className="mt-2 text-slate-600">{f.desc}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <span className="text-fuchsia-600">No Comenta:</span> {f.noComenta}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Comenta ===== */}
      <section id="comenta" className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-400">
              Produto principal
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Comenta: todo o seu atendimento em um só lugar
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              O Comenta reúne seus canais, entende cada conversa e sugere a melhor resposta. Sua
              equipe atende mais rápido, sem perder o toque humano.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {CANAIS.map((c) => (
                <span
                  key={c.nome}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200"
                >
                  <span>{c.icon}</span> {c.nome}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={APP_URL}
                className="rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-6 py-3 text-center font-semibold text-white shadow-xl shadow-fuchsia-500/30 transition hover:opacity-90"
              >
                Criar conta grátis
              </a>
              <a
                href="/#recursos"
                className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10"
              >
                Ver todos os recursos
              </a>
            </div>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ENTREGAS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Planos ===== */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-600">
            Planos do Comenta
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Comece grátis, cresça quando precisar
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Os limites abaixo são os que a plataforma cobra de verdade. O comparativo completo está
            na{" "}
            <a href="/#planos" className="font-semibold text-fuchsia-600 hover:underline">
              página do Comenta
            </a>
            .
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANOS.map((p) => (
            <div
              key={p.id}
              className={`rounded-3xl border p-7 ${
                p.destaque
                  ? "border-fuchsia-300 bg-gradient-to-b from-fuchsia-50 to-white shadow-xl shadow-fuchsia-500/10"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{p.nome}</h3>
                {p.destaque && (
                  <span className="rounded-full bg-fuchsia-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    Mais popular
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{p.preco}</span>
                <span className="text-sm text-slate-500">{p.periodo}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{p.desc}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {p.itens.map((i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> {i}
                  </li>
                ))}
              </ul>
              <a
                href={p.id === "business" ? "/contato" : APP_URL}
                className={`mt-6 block rounded-full px-4 py-2.5 text-center text-sm font-semibold transition ${
                  p.destaque
                    ? "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white hover:opacity-90"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 px-6 py-14 text-center text-white sm:px-12">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">
            Quer o Comenta na sua operação?
          </h2>
          <p className="relative mx-auto mt-4 max-w-2xl text-lg text-white/85">
            Crie a conta grátis e conecte o primeiro canal hoje. Se preferir falar com a IntSoft
            antes, a mensagem cai na nossa própria caixa de entrada do Comenta.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={APP_URL}
              className="rounded-full bg-white px-6 py-3 font-semibold text-fuchsia-700 shadow-xl transition hover:bg-slate-50"
            >
              Começar grátis
            </a>
            <a
              href="/contato"
              className="rounded-full border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Falar com a IntSoft
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// Cartão do produto no hero: uma amostra estática da caixa de entrada do
// Comenta, para a página da empresa mostrar o produto sem repetir a home.
function ProdutoCard() {
  const conversas = [
    { canal: "🟢", nome: "Ana · WhatsApp", msg: "Oi, meu pedido chegou hoje?", tag: "Urgente" },
    { canal: "📸", nome: "João · Instagram", msg: "Vocês têm no tamanho M?", tag: "Vendas" },
    { canal: "🌐", nome: "Chat do site", msg: "Como funciona o plano Pro?", tag: "IA respondeu" },
  ];
  return (
    <div className="relative reveal">
      <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 blur-2xl" />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between px-1 pb-4">
          <div className="flex items-center gap-2 font-extrabold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white">
              C
            </span>
            Comenta
          </div>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
            feito pela IntSoft
          </span>
        </div>
        <div className="space-y-2">
          {conversas.map((c) => (
            <div
              key={c.nome}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
            >
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-lg ring-2 ring-indigo-300">
                {c.canal}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{c.nome}</span>
                  <span className="flex-none rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                    {c.tag}
                  </span>
                </div>
                <p className="truncate text-sm text-slate-500">{c.msg}</p>
              </div>
            </div>
          ))}
        </div>
        <a
          href="/"
          className="mt-4 block rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 p-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
        >
          Abrir o site do Comenta →
        </a>
      </div>
    </div>
  );
}
