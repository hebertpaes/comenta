"use client";

import React from "react";

/**
 * Formulário de contato.
 *
 * Não manda e-mail: abre uma conversa de verdade no Comenta, pelo mesmo
 * `/widget/start` que o widget do site usa. A mensagem cai na caixa de entrada
 * da equipe como qualquer outro atendimento — e o visitante já vê a plataforma
 * funcionando antes de criar conta.
 *
 * O telefone é obrigatório porque a API exige (10 a 15 dígitos com DDI/DDD): é
 * por ele que o contato é reconhecido quando voltar a escrever.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.comenta.com.br";

const TIMES = ["Vendas", "Suporte", "Financeiro"];

export default function ContactForm() {
  const [nome, setNome] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [time, setTime] = React.useState(TIMES[0]);
  const [mensagem, setMensagem] = React.useState("");
  const [estado, setEstado] = React.useState<"parado" | "enviando" | "ok">("parado");
  const [erro, setErro] = React.useState("");

  const digitos = telefone.replace(/\D/g, "");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!mensagem.trim()) return setErro("Escreva sua mensagem.");
    // Mesma faixa que a API valida — melhor avisar aqui do que devolver 400.
    if (digitos.length < 10 || digitos.length > 15) {
      return setErro("Informe um WhatsApp válido, com DDD (ex.: 11 91234-5678).");
    }

    setEstado("enviando");
    try {
      const r = await fetch(`${API_URL}/widget/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome.trim() || undefined,
          phone: digitos,
          team: time,
          message: mensagem.trim(),
        }),
      });
      if (!r.ok) {
        const corpo = await r.json().catch(() => null);
        throw new Error(corpo?.error || "Não consegui enviar agora.");
      }
      setEstado("ok");
    } catch (e) {
      setEstado("parado");
      setErro(e instanceof Error ? e.message : "Não consegui enviar agora.");
    }
  };

  if (estado === "ok") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="mt-4 text-xl font-bold text-emerald-900">Mensagem recebida</h2>
        <p className="mt-2 text-emerald-800">
          Sua mensagem abriu uma conversa na equipe de <strong>{time}</strong> — exatamente como
          acontece com um cliente seu. Respondemos no WhatsApp que você informou.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ct-nome" className="text-sm font-semibold text-slate-700">
            Seu nome
          </label>
          <input
            id="ct-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como podemos te chamar?"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-fuchsia-500"
          />
        </div>

        <div>
          <label htmlFor="ct-fone" className="text-sm font-semibold text-slate-700">
            WhatsApp <span className="text-fuchsia-600">*</span>
          </label>
          <input
            id="ct-fone"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 91234-5678"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-fuchsia-500"
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="ct-time" className="text-sm font-semibold text-slate-700">
          Falar com
        </label>
        <select
          id="ct-time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-fuchsia-500"
        >
          {TIMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label htmlFor="ct-msg" className="text-sm font-semibold text-slate-700">
          Mensagem <span className="text-fuchsia-600">*</span>
        </label>
        <textarea
          id="ct-msg"
          rows={5}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Conte o que você precisa — quantos atendentes, quais canais, o que usa hoje…"
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-4 py-2.5 outline-none focus:border-fuchsia-500"
        />
      </div>

      {erro && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <button
        disabled={estado === "enviando"}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {estado === "enviando" ? "Enviando…" : "Enviar mensagem"}
      </button>

      <p className="mt-4 text-center text-xs text-slate-500">
        Isto abre uma conversa real no Comenta — é o mesmo caminho que as mensagens dos seus
        clientes fazem.
      </p>
    </form>
  );
}
