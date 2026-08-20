import React from "react";
import Faq from "./components/Faq";
import PlanComparison from "./components/PlanComparison";
import PriceCalculator from "./components/PriceCalculator";
import SiteFooter from "./components/SiteFooter";
import FeatureCards from "./components/FeatureCards";
import Testimonials from "./components/Testimonials";
import StreamingSection from "./components/StreamingSection";
import { PLANOS } from "./lib/plans";
import { RECURSOS } from "./recursos/dados";

// Landing do Comenta — SaaS de atendimento multicanal com IA (Claude).
// Server Component, estático. Visual colorido/vibrante com Tailwind.

// URLs do app/painel e da API. Configuráveis por build arg
// (NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_API_URL) para apontar ao ambiente local
// em testes; sem eles, caem no domínio de produção.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";

// Cada card descreve algo que a plataforma REALMENTE faz hoje. O que ainda não
// entrega mensagem mora na tabela de canais abaixo, marcado como "em breve" —
// prometer aqui o que não existe cria expectativa que o produto não paga.
const FEATURES = [
  {
    icon: "💬",
    title: "Tudo em uma caixa de entrada",
    desc: "WhatsApp, Instagram Direct, Messenger e o chat do site num só lugar. Nenhuma mensagem cai no vácuo.",
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: "✨",
    title: "IA que classifica e prioriza",
    desc: "Cada conversa é organizada e priorizada automaticamente pela IA da Anthropic (Claude).",
    color: "from-violet-500 to-indigo-500",
  },
  {
    icon: "⚡",
    title: "Respostas sugeridas",
    desc: "A IA escreve a melhor resposta com base no histórico. Você só revisa e envia.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: "📝",
    title: "Resumo de conversas",
    desc: "Entenda todo o histórico em segundos — qualquer pessoa do time assume sem se perder.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: "🤖",
    title: "Autoatendimento com handoff",
    desc: "A IA responde sozinha as dúvidas simples e passa para uma pessoa no instante em que o caso pede.",
    color: "from-purple-500 to-fuchsia-500",
  },
  {
    icon: "📋",
    title: "Kanban de atendimento",
    desc: "Arraste a conversa entre aguardando, em atendimento e resolvida. O status muda junto.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: "🗂️",
    title: "Filas por departamento",
    desc: "Vendas, suporte, financeiro — cada fila com sua equipe e seu horário de funcionamento.",
    color: "from-teal-500 to-emerald-500",
  },
  {
    icon: "🕐",
    title: "Horário comercial que responde",
    desc: "Fora do expediente o cliente recebe um aviso na hora, em vez de silêncio até o dia seguinte.",
    color: "from-slate-500 to-slate-700",
  },
  {
    icon: "⌨️",
    title: "Respostas rápidas",
    desc: "Atalhos para o que sua equipe repete o dia inteiro. Digita o atalho, sai o texto completo.",
    color: "from-lime-500 to-green-500",
  },
  {
    icon: "🏷️",
    title: "Tags e notas internas",
    desc: "Marque o assunto e deixe recados que só a equipe vê — o cliente nunca enxerga.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: "📣",
    title: "Campanhas com ritmo humano",
    desc: "Envio espaçado, em lotes e dentro do horário comercial — para o número não ser bloqueado.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: "⭐",
    title: "Avaliação depois do atendimento",
    desc: "Ao resolver, o cliente recebe a pesquisa e a nota volta para o painel automaticamente.",
    color: "from-yellow-500 to-amber-500",
  },
  {
    icon: "💼",
    title: "Chat interno da equipe",
    desc: "Combine a resposta com o colega sem sair da plataforma nem abrir outro aplicativo.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: "🎓",
    title: "Academia para treinar o time",
    desc: "Cursos e aulas dentro do próprio painel — quem entra hoje aprende a atender sozinho.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: "🔔",
    title: "Tempo real",
    desc: "Mensagens e métricas ao vivo via WebSocket. O time vê tudo acontecer na hora.",
    color: "from-sky-500 to-cyan-500",
  },
  {
    icon: "🔗",
    title: "Webhooks & automações",
    desc: "Conecte seu CRM e ferramentas com entregas assinadas (HMAC) e retry em fila.",
    color: "from-rose-500 to-red-500",
  },
  {
    icon: "👥",
    title: "Times e permissões",
    desc: "Administradores configuram; atendentes atendem. Cada um enxerga só o que precisa.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: "📇",
    title: "Contatos importados",
    desc: "Traga sua base por planilha ou puxe a agenda do WhatsApp conectado, sem digitar um a um.",
    color: "from-emerald-500 to-green-500",
  },
];

/**
 * Canais, com o estado real de cada um.
 *
 * `pronto: false` NÃO é "quase lá": significa que a conexão existe no painel mas
 * ainda não entrega mensagem. Dizer o contrário aqui vira reclamação no primeiro
 * dia de uso.
 */
const CANAIS = [
  {
    icon: "🟢",
    nome: "WhatsApp",
    detalhe: "Vários números ao mesmo tempo, conectados por QR Code.",
    pronto: true,
  },
  {
    icon: "📸",
    nome: "Instagram Direct",
    detalhe: "Conta profissional ligada a uma página do Facebook.",
    pronto: true,
  },
  {
    icon: "💬",
    nome: "Facebook Messenger",
    detalhe: "Mensagens da sua página caem na mesma caixa de entrada.",
    pronto: true,
  },
  {
    icon: "🌐",
    nome: "Chat do site",
    detalhe: "Widget pronto para colar no seu site. Ativo por padrão.",
    pronto: true,
  },
  {
    icon: "✈️",
    nome: "Telegram",
    detalhe: "Encaixe pronto no painel; a entrega de mensagens vem a seguir.",
    pronto: false,
  },
  {
    icon: "✉️",
    nome: "E-mail",
    detalhe: "Encaixe pronto no painel; a entrega de mensagens vem a seguir.",
    pronto: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white">
              C
            </span>
            Comenta
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="/gumesmomo" className="font-bold text-fuchsia-600 hover:text-fuchsia-700">
              gumesmomo.com.br
            </a>
            <a href="#recursos" className="hover:text-slate-900">
              Recursos
            </a>
            <a href="#canais" className="hover:text-slate-900">
              Canais
            </a>
            <a href="#ia" className="hover:text-slate-900">
              IA
            </a>
            <a href="#planos" className="hover:text-slate-900">
              Planos
            </a>
            <a href="/docs" className="hover:text-slate-900">
              Docs
            </a>
            <a href="/contato" className="hover:text-slate-900">
              Contato
            </a>
            <a href={APP_URL} className="hover:text-slate-900">
              Entrar
            </a>
          </nav>
          <a
            href={APP_URL}
            className="rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:opacity-90"
          >
            Começar grátis
          </a>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative">
        <div className="blob left-[-6rem] top-[-4rem] h-72 w-72 bg-fuchsia-400" />
        <div
          className="blob right-[-5rem] top-10 h-80 w-80 bg-indigo-400"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="blob left-1/3 top-40 h-72 w-72 bg-amber-300"
          style={{ animationDelay: "-8s" }}
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">
              <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
              Atendimento com IA · WhatsApp, Instagram, Messenger e mais
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Todo o seu atendimento em um só lugar — com{" "}
              <span className="text-gradient">IA que responde por você</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              O Comenta reúne seus canais, entende cada conversa e sugere a melhor resposta. Sua
              equipe atende mais rápido, sem perder o toque humano.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={APP_URL}
                className="rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-6 py-3 text-center font-semibold text-white shadow-xl shadow-fuchsia-500/30 transition hover:opacity-90"
              >
                Começar grátis
              </a>
              <a
                href="#recursos"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Ver como funciona
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Sem cartão de crédito · Configure em minutos
            </p>
          </div>

          {/* Mockup de caixa de entrada */}
          <div className="reveal" style={{ animationDelay: "0.15s" }}>
            <ChatMockup />
          </div>
        </div>
      </section>

      {/* ===== Métricas ===== */}
      <section className="border-y border-slate-200 bg-gradient-to-r from-fuchsia-50 via-white to-indigo-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4">
          {[
            ["−60%", "tempo de resposta"],
            ["4", "canais prontos para usar"],
            ["24/7", "atendimento com IA"],
            ["99,9%", "de disponibilidade"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-indigo-600 sm:text-4xl">
                {n}
              </div>
              <div className="mt-1 text-sm text-slate-600">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Recursos ===== */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Tudo para atender <span className="text-gradient">melhor e mais rápido</span>
          </h2>
          <p className="mt-4 text-slate-600">
            Uma plataforma completa de atendimento — com inteligência artificial em cada etapa da
            conversa.
          </p>
        </div>

        <div className="mt-14">
          <FeatureCards />
        </div>

        {/* Os cards acima resumem; quem quer saber COMO funciona vai para a
            página do recurso. */}
        <div className="mt-16">
          <h3 className="text-center text-lg font-bold text-slate-900">Aprofunde no que importa</h3>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {RECURSOS.map((r) => (
              <a
                key={r.slug}
                href={`/recursos/${r.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-fuchsia-400 hover:text-fuchsia-600"
              >
                <span aria-hidden="true">{r.icone}</span>
                {r.titulo}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Canais ===== */}
      <section id="canais" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Seus canais, <span className="text-gradient">uma conversa só</span>
            </h2>
            <p className="mt-4 text-slate-600">
              O cliente escolhe por onde falar. Sua equipe atende tudo na mesma tela, com o
              histórico junto.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CANAIS.map((c) => (
              <div
                key={c.nome}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  {c.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{c.nome}</h3>
                    <span
                      className={
                        c.pronto
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500"
                      }
                    >
                      {c.pronto ? "Disponível" : "Em breve"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{c.detalhe}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Marcamos como <strong className="text-slate-700">Disponível</strong> só o que já entrega
            mensagem de verdade.
          </p>
        </div>
      </section>

      {/* ===== Destaque IA ===== */}
      <section id="ia" className="relative overflow-hidden bg-slate-950 text-white">
        <div className="blob left-10 top-0 h-72 w-72 bg-fuchsia-600" />
        <div
          className="blob right-0 bottom-0 h-80 w-80 bg-indigo-600"
          style={{ animationDelay: "-6s" }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-fuchsia-200">
              ✨ IA da Anthropic (Claude) integrada
            </span>
            <h2 className="mt-5 text-3xl font-extrabold sm:text-4xl">
              A IA faz o trabalho pesado. Sua equipe dá o toque humano.
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                [
                  "Classifica",
                  "prioriza e organiza cada nova conversa — modelo rápido e econômico (Haiku).",
                ],
                ["Resume", "condensa históricos longos para o atendente entender na hora."],
                ["Sugere", "escreve a resposta ideal para você revisar e enviar (Sonnet)."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-slate-200">
                    <strong className="text-white">{t}:</strong> {d}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-slate-400">
              Modelos configuráveis. Sem chave de IA, o restante da plataforma segue funcionando
              normalmente.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300">
              Sugestão da IA
            </div>
            <div className="mt-3 rounded-2xl bg-slate-900/80 p-4 text-sm text-slate-200">
              <p className="text-slate-400">Cliente:</p>
              <p className="mt-1">“Meu pedido #1043 ainda não chegou, já faz uma semana 😟”</p>
              <div className="my-4 h-px bg-white/10" />
              <p className="text-fuchsia-300">Comenta sugere:</p>
              <p className="mt-1">
                “Oi! Sinto muito pela demora 🙏 Localizei o pedido #1043 — ele saiu para entrega
                hoje e chega até amanhã. Quer que eu te envie o código de rastreio agora?”
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold">
                Enviar
              </button>
              <button className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200">
                Editar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Streaming Netflix / YouTube / Amazon Style ===== */}
      <StreamingSection />

      {/* ===== Depoimentos ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-fuchsia-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-12 text-center text-3xl font-extrabold sm:text-4xl">
            Times que já atendem com o <span className="text-gradient">Comenta</span>
          </h2>
          <Testimonials />
        </div>
      </section>

      {/* ===== Planos ===== */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Planos que crescem com você</h2>
          <p className="mt-4 text-slate-600">
            Comece grátis e evolua quando precisar. Valores ilustrativos.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PLANOS.map((p) => (
            <div
              key={p.nome}
              className={`relative rounded-3xl border p-8 ${
                p.destaque
                  ? "border-transparent bg-gradient-to-b from-fuchsia-600 to-indigo-600 text-white shadow-2xl shadow-fuchsia-500/30 lg:-translate-y-4"
                  : "border-slate-200 bg-white"
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-bold">{p.nome}</h3>
              <p className={`mt-1 text-sm ${p.destaque ? "text-fuchsia-100" : "text-slate-500"}`}>
                {p.desc}
              </p>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-extrabold">{p.preco}</span>
                <span
                  className={`mb-1 text-sm ${p.destaque ? "text-fuchsia-100" : "text-slate-500"}`}
                >
                  {p.periodo}
                </span>
              </div>
              <a
                href={APP_URL}
                className={`mt-6 block rounded-full px-4 py-3 text-center font-semibold transition ${
                  p.destaque
                    ? "bg-white text-fuchsia-700 hover:opacity-90"
                    : "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white hover:opacity-90"
                }`}
              >
                {p.cta}
              </a>
              <ul className="mt-6 space-y-3 text-sm">
                {p.itens.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className={p.destaque ? "text-amber-300" : "text-fuchsia-500"}>✓</span>
                    <span className={p.destaque ? "text-white" : "text-slate-700"}>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Calculadora: responde "qual plano é o meu?" sem obrigar a comparar
            três cards de cabeça. */}
        <div className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-2xl font-extrabold sm:text-3xl">Qual plano é o seu?</h3>
            <p className="mt-3 text-slate-600">
              Ajuste o tamanho da sua operação e veja a recomendação.
            </p>
          </div>
          <div className="mt-10">
            <PriceCalculator />
          </div>
        </div>

        {/* Tabela: para quem já entendeu o preço e quer conferir recurso a
            recurso antes de decidir. */}
        <div className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-2xl font-extrabold sm:text-3xl">Comparação completa</h3>
            <p className="mt-3 text-slate-600">Tudo que entra em cada plano, item por item.</p>
          </div>
          <div className="mt-10">
            <PlanComparison />
          </div>
        </div>
      </section>

      {/* ===== Perguntas frequentes ===== */}
      <section id="faq" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Perguntas frequentes</h2>
            <p className="mt-4 text-slate-600">
              As dúvidas que aparecem antes de conectar o primeiro número.
            </p>
          </div>
          <div className="mt-12">
            <Faq />
          </div>
          <p className="mt-10 text-center text-slate-600">
            Não achou a sua?{" "}
            <a href="/contato" className="font-semibold text-fuchsia-600 hover:underline">
              Fale com a gente
            </a>{" "}
            ou veja a{" "}
            <a href="/docs" className="font-semibold text-fuchsia-600 hover:underline">
              documentação
            </a>
            .
          </p>
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-6 py-16 text-center text-white">
          <div className="blob left-10 top-0 h-56 w-56 bg-amber-300" />
          <div
            className="blob right-10 bottom-0 h-56 w-56 bg-pink-400"
            style={{ animationDelay: "-5s" }}
          />
          <div className="relative">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Pronto para atender melhor?</h2>
            <p className="mx-auto mt-3 max-w-xl text-fuchsia-100">
              Conecte seus canais em minutos e deixe a IA acelerar cada resposta.
            </p>
            <a
              href={APP_URL}
              className="mt-8 inline-block rounded-full bg-white px-8 py-3 font-semibold text-fuchsia-700 shadow-xl transition hover:opacity-90"
            >
              Começar grátis
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// Mockup visual da caixa de entrada multicanal (estático).
function ChatMockup() {
  const convos = [
    {
      canal: "💬",
      nome: "Ana · WhatsApp",
      msg: "Oi, meu pedido chegou hoje?",
      tag: "Urgente",
      cor: "bg-rose-100 text-rose-700",
      ring: "ring-emerald-400",
    },
    {
      canal: "📸",
      nome: "João · Instagram",
      msg: "Vocês têm no tamanho M?",
      tag: "Vendas",
      cor: "bg-violet-100 text-violet-700",
      ring: "ring-fuchsia-400",
    },
    {
      canal: "✉️",
      nome: "Suporte · E-mail",
      msg: "Preciso da 2ª via da nota…",
      tag: "Financeiro",
      cor: "bg-amber-100 text-amber-700",
      ring: "ring-sky-400",
    },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 blur-2xl" />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between px-2 pb-3">
          <div className="text-sm font-bold">Caixa de entrada</div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            3 novas
          </span>
        </div>
        <div className="space-y-2">
          {convos.map((c) => (
            <div
              key={c.nome}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
            >
              <span
                className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-lg ring-2 ${c.ring}`}
              >
                {c.canal}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{c.nome}</span>
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${c.cor}`}
                  >
                    {c.tag}
                  </span>
                </div>
                <p className="truncate text-sm text-slate-500">{c.msg}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 p-3 text-center text-sm font-semibold text-white">
          ✨ IA sugeriu 3 respostas
        </div>
      </div>
    </div>
  );
}
