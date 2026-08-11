"use client";

// Calculadora de ROI — estima quanto tempo (e dinheiro) o time economiza ao
// deixar a IA acelerar o atendimento. Tudo roda no navegador: nenhuma chamada
// de rede, nenhum dado sai daqui. Os números são estimativas declaradas, não
// promessa contratual — por isso a nota de rodapé no fim do card.

import React, { useMemo, useState } from "react";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

// Plano sugerido pelo tamanho do time — espelha a tabela da seção Planos.
function planoPara(atendentes: number): { nome: string; mensal: number } {
  if (atendentes <= 1) return { nome: "Free", mensal: 0 };
  if (atendentes <= 10) return { nome: "Pro", mensal: 99 };
  return { nome: "Business", mensal: 299 };
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
};

function Slider({ label, value, min, max, step, onChange, format }: SliderProps) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-fuchsia-700">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="roi-range mt-2 w-full"
      />
    </label>
  );
}

export default function RoiCalculator() {
  const [atendentes, setAtendentes] = useState(4);
  const [conversas, setConversas] = useState(1200);
  const [minutos, setMinutos] = useState(8);
  const [custoHora, setCustoHora] = useState(30);
  const [ganho, setGanho] = useState(50); // % do tempo que a IA economiza

  const r = useMemo(() => {
    const horasHoje = (conversas * minutos) / 60;
    const horasEconomizadas = horasHoje * (ganho / 100);
    const economia = horasEconomizadas * custoHora;
    const plano = planoPara(atendentes);
    const liquido = economia - plano.mensal;
    // Com o mesmo time e o tempo liberado, quantas conversas a mais cabem no mês.
    const conversasExtras = minutos > 0 ? (horasEconomizadas * 60) / minutos : 0;
    // "Paga-se em X dias": quanto tempo de economia cobre a mensalidade.
    const economiaDiaria = economia / 30;
    const paybackDias = plano.mensal > 0 && economiaDiaria > 0 ? plano.mensal / economiaDiaria : 0;
    return {
      horasHoje,
      horasEconomizadas,
      economia,
      plano,
      liquido,
      conversasExtras,
      paybackDias,
    };
  }, [atendentes, conversas, minutos, custoHora, ganho]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Entradas */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
        <h3 className="text-lg font-bold">Como é o seu atendimento hoje?</h3>
        <p className="mt-1 text-sm text-slate-500">
          Ajuste os controles — o resultado atualiza na hora, sem enviar nada para lugar nenhum.
        </p>

        <div className="mt-6 space-y-6">
          <Slider
            label="Pessoas no atendimento"
            value={atendentes}
            min={1}
            max={50}
            step={1}
            onChange={setAtendentes}
            format={(v) => `${v} ${v === 1 ? "pessoa" : "pessoas"}`}
          />
          <Slider
            label="Conversas por mês"
            value={conversas}
            min={100}
            max={20000}
            step={100}
            onChange={setConversas}
            format={(v) => NUM.format(v)}
          />
          <Slider
            label="Tempo médio gasto por conversa"
            value={minutos}
            min={1}
            max={40}
            step={1}
            onChange={setMinutos}
            format={(v) => `${v} min`}
          />
          <Slider
            label="Custo por hora do atendente"
            value={custoHora}
            min={10}
            max={150}
            step={5}
            onChange={setCustoHora}
            format={(v) => `${BRL.format(v)}/h`}
          />
          <Slider
            label="Quanto do tempo a IA economiza"
            value={ganho}
            min={10}
            max={70}
            step={5}
            onChange={setGanho}
            format={(v) => `${v}%`}
          />
        </div>
      </div>

      {/* Resultado */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 p-6 text-white shadow-2xl shadow-fuchsia-500/25 lg:col-span-2">
        <div className="blob right-[-3rem] top-[-2rem] h-48 w-48 bg-amber-300" />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-wide text-fuchsia-200">
            Sua economia estimada
          </div>
          <div className="mt-2 text-4xl font-extrabold leading-none sm:text-5xl">
            {BRL.format(r.economia)}
            <span className="ml-1 text-base font-semibold text-fuchsia-200">/mês</span>
          </div>
          <div className="mt-1 text-sm text-fuchsia-100">
            {NUM.format(r.horasEconomizadas)} horas devolvidas ao time todo mês
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            {[
              ["Horas gastas hoje", `${NUM.format(r.horasHoje)} h/mês`],
              ["Plano sugerido", `${r.plano.nome} · ${BRL.format(r.plano.mensal)}/mês`],
              ["Economia líquida", `${BRL.format(r.liquido)}/mês`],
              ["Capacidade extra", `+${NUM.format(r.conversasExtras)} conversas/mês`],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-3 border-b border-white/15 pb-2"
              >
                <dt className="text-fuchsia-100">{k}</dt>
                <dd className="text-right font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          {r.plano.mensal > 0 && r.paybackDias > 0 && (
            <p className="mt-4 rounded-2xl bg-white/10 px-3 py-2 text-sm">
              💡 O plano {r.plano.nome} se paga em{" "}
              <strong>
                {r.paybackDias < 1 ? "menos de 1 dia" : `${NUM.format(r.paybackDias)} dias`}
              </strong>{" "}
              de economia.
            </p>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-fuchsia-200">
            Estimativa a partir dos valores que você informou. Não é garantia de resultado — depende
            do seu volume, do time e dos canais conectados.
          </p>
        </div>
      </div>

      <style jsx>{`
        .roi-range {
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          background: linear-gradient(90deg, #d946ef, #6366f1);
          outline: none;
        }
        .roi-range::-webkit-slider-thumb {
          appearance: none;
          height: 22px;
          width: 22px;
          border-radius: 9999px;
          background: #fff;
          border: 3px solid #a21caf;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(162, 28, 175, 0.35);
        }
        .roi-range::-moz-range-thumb {
          height: 22px;
          width: 22px;
          border-radius: 9999px;
          background: #fff;
          border: 3px solid #a21caf;
          cursor: pointer;
        }
        .roi-range:focus-visible {
          box-shadow: 0 0 0 3px rgba(217, 70, 239, 0.35);
        }
      `}</style>
    </div>
  );
}
