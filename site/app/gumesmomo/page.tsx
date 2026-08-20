import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Dumbbell, Zap, Flame, ShieldCheck, HeartPulse, Sparkles, CheckCircle2, ArrowRight, Star, ShoppingCart, Award, Truck, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Gumesmomo — Gomas de Creatina Pura para Saúde & Fitness | 100% Monohidratada",
  description: "Gumesmomo (gumesmomo.com.br): A revolução da suplementação esportiva. Gomas de Creatina Monohidratada saborosas, sem açúcar, para ganho de força, hipertrofia e energia diária.",
};

export default function GumesmomoFitnessPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black overflow-x-hidden">
      {/* Background Decorative Glow Blobs */}
      <div className="fixed top-0 left-1/3 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Banner de Frete Grátis */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 text-slate-950 font-black text-xs py-2 text-center tracking-wider uppercase">
        ⚡ Frete Grátis para todo o Brasil em compras acima de R$ 149,00 + Ganhe 10% OFF no PIX!
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#07090e]/85 border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/gumesmomo" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
              🍬
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                GUMESMOMO<span className="text-emerald-400">.FIT</span>
              </span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Gomas de Creatina Pura • Saúde & Fitness
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-300">
            <a href="#beneficios" className="hover:text-emerald-400 transition-colors">
              Benefícios
            </a>
            <a href="#galeria" className="hover:text-emerald-400 transition-colors">
              Galeria de Fotos
            </a>
            <a href="#combos" className="hover:text-emerald-400 transition-colors">
              Kits & Promoções
            </a>
            <a href="#depoimentos" className="hover:text-emerald-400 transition-colors">
              Avaliações
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="#combos"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" /> Comprar Agora
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-black mb-8 shadow-inner">
          <Sparkles className="w-4 h-4 text-emerald-400" /> A Evolução da Suplementação Esportiva no Brasil
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight max-w-5xl mx-auto">
          Gomas de Creatina Pura: <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Mais Força, Energia & Praticidade
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
          Diga adeus ao pó que empelota e ao copo d&apos;água. Desfrute de 3g de Creatina Monohidratada de altíssima pureza por dose em gomas deliciosas, sem açúcar e fáceis de levar para qualquer lugar!
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#combos"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all flex items-center gap-3"
          >
            🍬 Garantir Meu Kit com Desconto <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#beneficios"
            className="px-8 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-base hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Dumbbell className="w-5 h-5 text-emerald-400" /> Ver Tabela Nutricional
          </a>
        </div>

        {/* FOTO EM DESTAQUE DO POTE GUMESMOMO CREATINE GUMMIES */}
        <div className="mt-16 relative mx-auto max-w-5xl rounded-3xl overflow-hidden border border-emerald-500/30 bg-slate-950/90 shadow-2xl shadow-emerald-950/60 p-6 sm:p-10 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-block px-3.5 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-wider">
                🔬 Fórmula Premium 100% Pura
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Por que trocar a Creatina em Pó pelas Gomas Gumesmomo?
              </h2>

              <ul className="space-y-4 text-sm font-semibold text-slate-300">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span><strong>3g de Creatina Pura por Dose:</strong> Exatamente o recomendado por nutricionistas esportivos.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span><strong>Zero Açúcar & Baixas Calorias:</strong> Encaixa perfeitamente em dietas de cutting e bulking.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span><strong>Sem Necessidade de Água:</strong> Consuma no treino, no carro ou no escritório.</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span><strong>Absorção Rápida & Deliciosa:</strong> Digestão leve sem inchaço gástrico.</span>
                </li>
              </ul>
            </div>

            {/* IMAGEM GERADA 1: EMBALAGEM / POTE DE GOMAS GUMESMOMO */}
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl group">
              <Image
                src="/images/gumesmomo_jar.jpg"
                alt="Pote de Gomas de Creatina Gumesmomo Creatine Gummies"
                width={600}
                height={600}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center justify-between">
                <span>🍬 Gumesmomo Creatine Gummies (1000mg/goma)</span>
                <span className="text-amber-400 font-black">★ 4.9/5.0</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GALERIA DE FOTOS EM ALTA DEFINIÇÃO */}
      <section id="galeria" className="py-20 bg-slate-950/80 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
            Foto do Produto Real
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-12">
            Gomas Saborosas, Macias e Práticas de Consumir
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl">
              <Image
                src="/images/gumesmomo_hand.jpg"
                alt="Gomas de Creatina Gumesmomo na mão na academia"
                width={600}
                height={600}
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="p-4 bg-slate-900 border-t border-slate-800 text-left text-xs">
                <span className="font-bold text-white block">Sabor Frutas Vermelhas & Limão Cítrico</span>
                <span className="text-slate-400">Gomas macias revestidas de cristais de creatina pura sem açúcar.</span>
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl">
              <Image
                src="/images/gumesmomo_jar.jpg"
                alt="Gumesmomo Creatine Gummies Jar"
                width={600}
                height={600}
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="p-4 bg-slate-900 border-t border-slate-800 text-left text-xs">
                <span className="font-bold text-white block">Pote Translucido de Alta Proteção UV</span>
                <span className="text-slate-400">Mantém o sabor e a potência da creatina intactos por mais tempo.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS PARA SAÚDE E FITNESS */}
      <section id="beneficios" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
            Ciência & Nutrição Esportiva
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
            Desenvolvido para quem busca resultados de verdade
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-6">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Hipertrofia & Força Bruta</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Aumenta os estoques de fosfocreatina muscular, permitindo mais cargas e mais repetições em cada treino de musculação ou crossfit.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Explosão & Recuperação</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ressintetiza as moléculas de ATP em segundos, reduzindo a fadiga muscular e acelerando a recuperação entre os sets de exercícios.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold mb-6">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Foco Mental & Cognição</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              A creatina também alimenta os neurônios, fornecendo clareza mental, foco para trabalhar e estudar, além de proteger a saúde celular.
            </p>
          </div>
        </div>
      </section>

      {/* COMBOS E KITS DE VENDAS */}
      <section id="combos" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="max-w-3xl mx-auto mb-16">
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
            Oferta Especial por Tempo Limitado
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-3">
            Escolha seu Kit Gumesmomo
          </h2>
          <p className="text-slate-400 text-sm mt-3">
            Todas as compras acompanham garantia incondicional de 30 dias.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* POTE INDIVIDUAL */}
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between text-left hover:border-slate-700 transition-all">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tratamento 30 Dias</div>
              <h3 className="text-2xl font-black text-white mt-1">1 Pote (60 Gomas)</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">R$ 89,90</span>
                <span className="text-xs text-slate-500 line-through">R$ 119,90</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">ou 3x de R$ 29,97 sem juros</p>

              <ul className="mt-6 space-y-3 text-xs font-semibold text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 60 Gomas de 1.5g de Creatina</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sabor Frutas Vermelhas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Açúcar</li>
              </ul>
            </div>

            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Quero%20comprar%201%20pote%20do%20Gumesmomo%20Creatina"
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold text-xs text-center hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              Comprar 1 Pote <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* KIT DUPLO - MAIS VENDIDO */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-emerald-950/90 via-slate-900 to-teal-950 border-2 border-emerald-500 flex flex-col justify-between text-left relative shadow-xl shadow-emerald-950/80 transform md:-translate-y-3">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-md">
              🔥 Campeão de Vendas (+Economia)
            </div>

            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Tratamento 60 Dias</div>
              <h3 className="text-2xl font-black text-white mt-1">2 Potes (120 Gomas)</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black text-emerald-400">R$ 159,90</span>
                <span className="text-xs text-slate-400 line-through">R$ 239,80</span>
              </div>
              <p className="text-xs text-emerald-300 font-bold mt-1">Frete Grátis + 10% OFF no PIX (R$ 143,91)</p>

              <ul className="mt-6 space-y-3 text-xs font-semibold text-slate-200">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 120 Gomas de Creatina Pura</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sabores Frutas Vermelhas & Limão</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 🚚 Frete Grátis para todo o Brasil</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Guia Digital de Treino de Bônus</li>
              </ul>
            </div>

            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Quero%20o%20Kit%20Duplo%20Gumesmomo%20com%20Frete%20Gr%C3%A1tis"
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-sm text-center shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              🛒 Quero o Kit Duplo (Frete Grátis)
            </a>
          </div>

          {/* COMBO VIP 3 POTES */}
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between text-left hover:border-slate-700 transition-all">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Tratamento 90 Dias</div>
              <h3 className="text-2xl font-black text-white mt-1">3 Potes (180 Gomas)</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">R$ 219,90</span>
                <span className="text-xs text-slate-500 line-through">R$ 359,70</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Sai por R$ 73,30 cada pote + Frete Grátis</p>

              <ul className="mt-6 space-y-3 text-xs font-semibold text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 180 Gomas de Creatina Pura</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Máxima Economia da Linha</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 🚚 Frete Grátis prioritário</li>
              </ul>
            </div>

            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Quero%20o%20Combo%20VIP%203%20Potes%20Gumesmomo"
              target="_blank"
              rel="noreferrer"
              className="mt-8 w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold text-xs text-center hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              Comprar Combo 3 Potes <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* CERTIFICAÇÕES DE QUALIDADE */}
      <section className="py-12 bg-slate-950 border-t border-b border-slate-800 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-around gap-8 text-center text-xs font-bold text-slate-400">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /> Aprovado pela ANVISA</div>
          <div className="flex items-center gap-2"><Award className="w-5 h-5 text-teal-400" /> 100% Creatina Monohidratada</div>
          <div className="flex items-center gap-2"><Flame className="w-5 h-5 text-amber-400" /> Zero Açúcar / Gluten-Free</div>
          <div className="flex items-center gap-2"><Truck className="w-5 h-5 text-cyan-400" /> Envio Rápido em 24 Horas</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 text-center text-xs text-slate-400 border-t border-slate-900">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍬</span>
            <span className="font-extrabold text-white">GUMESMOMO.FIT</span>
            <span>© 2026 Gumesmomo Nutrição Esportiva Ltda.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">Voltar ao Comenta</Link>
            <a href="https://wa.me/5511999999999" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">Atendimento WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
