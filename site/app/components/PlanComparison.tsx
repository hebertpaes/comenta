import React from "react";

/**
 * Tabela comparativa dos planos.
 *
 * Complementa os cards da home: os cards vendem, a tabela responde "e o recurso
 * X, tem no meu plano?". Linha marcada com "—" é ausência real, não um traço
 * decorativo — quem lê está decidindo com base nisso.
 */

type Valor = boolean | string;

const LINHAS: { grupo: string; itens: { nome: string; free: Valor; pro: Valor; biz: Valor }[] }[] =
  [
    {
      grupo: "Limites",
      itens: [
        { nome: "Usuários", free: "1", pro: "Até 10", biz: "Ilimitados" },
        { nome: "Canais conectados", free: "1", pro: "Todos", biz: "Todos" },
        { nome: "Conversas por mês", free: "500", pro: "Ilimitadas", biz: "Ilimitadas" },
        { nome: "Números de WhatsApp", free: "1", pro: "Vários", biz: "Vários" },
      ],
    },
    {
      grupo: "Atendimento",
      itens: [
        { nome: "Caixa de entrada multicanal", free: true, pro: true, biz: true },
        { nome: "Filas por departamento", free: true, pro: true, biz: true },
        { nome: "Kanban de conversas", free: true, pro: true, biz: true },
        { nome: "Respostas rápidas", free: true, pro: true, biz: true },
        { nome: "Tags e notas internas", free: true, pro: true, biz: true },
        { nome: "Horário comercial por fila", free: true, pro: true, biz: true },
        { nome: "Chat interno da equipe", free: false, pro: true, biz: true },
        { nome: "Avaliação pós-atendimento", free: false, pro: true, biz: true },
      ],
    },
    {
      grupo: "Inteligência artificial",
      itens: [
        { nome: "Classificação de conversas", free: true, pro: true, biz: true },
        { nome: "Resumo do histórico", free: false, pro: true, biz: true },
        { nome: "Sugestão de resposta", free: false, pro: true, biz: true },
        { nome: "Robô de autoatendimento", free: false, pro: true, biz: true },
      ],
    },
    {
      grupo: "Marketing",
      itens: [
        { nome: "Widget de chat no site", free: true, pro: true, biz: true },
        { nome: "Importação de contatos", free: true, pro: true, biz: true },
        { nome: "Campanhas com ritmo anti-bloqueio", free: false, pro: true, biz: true },
        { nome: "Mídia nas campanhas", free: false, pro: true, biz: true },
        { nome: "Agendamento de disparo", free: false, pro: true, biz: true },
      ],
    },
    {
      grupo: "Plataforma",
      itens: [
        { nome: "Métricas e relatórios", free: false, pro: true, biz: true },
        { nome: "Academia para treinar o time", free: false, pro: true, biz: true },
        { nome: "API REST e chaves", free: false, pro: false, biz: true },
        { nome: "Webhooks assinados", free: false, pro: false, biz: true },
        { nome: "Registro de auditoria", free: false, pro: false, biz: true },
        { nome: "Suporte prioritário", free: false, pro: false, biz: true },
      ],
    },
  ];

function Celula({ v, destaque }: { v: Valor; destaque?: boolean }) {
  const base = `px-4 py-3 text-center text-sm ${destaque ? "bg-fuchsia-50/60" : ""}`;
  if (typeof v === "string") {
    return <td className={`${base} font-semibold text-slate-800`}>{v}</td>;
  }
  return (
    <td className={base}>
      {v ? (
        <span className="text-fuchsia-600" aria-label="incluído">
          ✓
        </span>
      ) : (
        <span className="text-slate-300" aria-label="não incluído">
          —
        </span>
      )}
    </td>
  );
}

export default function PlanComparison() {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200">
      <table className="w-full min-w-[640px] border-collapse bg-white">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-4 text-left text-sm font-bold text-slate-900">Recurso</th>
            <th className="px-4 py-4 text-center text-sm font-bold text-slate-900">Free</th>
            <th className="bg-fuchsia-50/60 px-4 py-4 text-center text-sm font-bold text-fuchsia-700">
              Pro
            </th>
            <th className="px-4 py-4 text-center text-sm font-bold text-slate-900">Business</th>
          </tr>
        </thead>
        <tbody>
          {LINHAS.map((secao) => (
            <React.Fragment key={secao.grupo}>
              <tr className="bg-slate-50">
                <td
                  colSpan={4}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  {secao.grupo}
                </td>
              </tr>
              {secao.itens.map((it) => (
                <tr key={it.nome} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-sm text-slate-700">{it.nome}</td>
                  <Celula v={it.free} />
                  <Celula v={it.pro} destaque />
                  <Celula v={it.biz} />
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
