"use client";

import React from "react";

/**
 * Calculadora de plano.
 *
 * Recomenda pelo LIMITE que estoura primeiro — atendentes ou conversas — em vez
 * de somar preço por usuário: os planos são de faixa fixa, e mostrar um valor
 * calculado que a página de planos não cobra seria mentira na primeira conta.
 *
 * Os limites espelham a tabela de planos da home; mexeu lá, mexa aqui.
 */

const PLANOS = [
  { nome: "Free", preco: 0, usuarios: 1, conversas: 500, canais: 1 },
  { nome: "Pro", preco: 99, usuarios: 10, conversas: Infinity, canais: Infinity },
  { nome: "Business", preco: 299, usuarios: Infinity, conversas: Infinity, canais: Infinity },
] as const;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.comenta.com.br";

const brl = (v: number) => `R$${v.toLocaleString("pt-BR")}`;

export default function PriceCalculator() {
  const [atendentes, setAtendentes] = React.useState(4);
  const [conversas, setConversas] = React.useState(1500);
  const [canais, setCanais] = React.useState(2);

  // Primeiro plano que comporta os três números. Business é o teto: nunca falha.
  const escolhido =
    PLANOS.find(
      (p) => atendentes <= p.usuarios && conversas <= p.conversas && canais <= p.canais
    ) ?? PLANOS[PLANOS.length - 1];

  // Por que os planos menores não serviram — é a parte que explica a conta.
  const motivos: string[] = [];
  for (const p of PLANOS) {
    if (p.nome === escolhido.nome) break;
    if (atendentes > p.usuarios) motivos.push(`${p.nome} vai até ${p.usuarios} usuário(s)`);
    else if (conversas > p.conversas)
      motivos.push(`${p.nome} vai até ${p.conversas.toLocaleString("pt-BR")} conversas/mês`);
    else if (canais > p.canais) motivos.push(`${p.nome} permite ${p.canais} canal`);
  }

  const porAtendente = escolhido.preco > 0 ? escolhido.preco / Math.max(1, atendentes) : 0;

  return (
    <div className="grid grid-cols-1 gap-8 rounded-3xl border border-slate-200 bg-white p-8 lg:grid-cols-2">
      <div className="space-y-7">
        <Campo
          id="calc-atendentes"
          label="Pessoas atendendo"
          valor={atendentes}
          min={1}
          max={50}
          onChange={setAtendentes}
          formata={(v) => `${v}${v === 50 ? "+" : ""}`}
        />
        <Campo
          id="calc-conversas"
          label="Conversas por mês"
          valor={conversas}
          min={100}
          max={10000}
          step={100}
          onChange={setConversas}
          formata={(v) => `${v.toLocaleString("pt-BR")}${v === 10000 ? "+" : ""}`}
        />
        <Campo
          id="calc-canais"
          label="Canais conectados"
          valor={canais}
          min={1}
          max={6}
          onChange={setCanais}
          formata={(v) => String(v)}
        />
      </div>

      <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 p-8 text-white">
        <div className="text-sm font-semibold uppercase tracking-wide text-fuchsia-200">
          Plano recomendado
        </div>
        <div className="mt-2 text-3xl font-extrabold">{escolhido.nome}</div>
        <div className="mt-1 flex items-end gap-1">
          <span className="text-5xl font-extrabold">{brl(escolhido.preco)}</span>
          <span className="mb-2 text-fuchsia-200">
            {escolhido.preco === 0 ? "para sempre" : "/mês"}
          </span>
        </div>

        {porAtendente > 0 && (
          <p className="mt-3 text-sm text-fuchsia-100">
            Dá {brl(Math.round(porAtendente))} por pessoa atendendo.
          </p>
        )}

        {motivos.length > 0 && (
          <p className="mt-4 text-sm text-fuchsia-100">Por quê: {motivos[motivos.length - 1]}.</p>
        )}

        <a
          href={APP_URL}
          className="mt-7 rounded-full bg-white px-5 py-3 text-center font-semibold text-fuchsia-700 transition hover:opacity-90"
        >
          {escolhido.preco === 0 ? "Começar grátis" : `Assinar ${escolhido.nome}`}
        </a>
        <p className="mt-3 text-center text-xs text-fuchsia-200">
          Valores ilustrativos. Comece no Free e mude quando precisar.
        </p>
      </div>
    </div>
  );
}

function Campo({
  id,
  label,
  valor,
  min,
  max,
  step = 1,
  onChange,
  formata,
}: {
  id: string;
  label: string;
  valor: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  formata: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="font-semibold text-slate-700">
          {label}
        </label>
        <span className="text-lg font-extrabold text-fuchsia-600">{formata(valor)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-fuchsia-600"
      />
    </div>
  );
}
