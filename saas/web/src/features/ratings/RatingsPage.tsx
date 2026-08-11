import type { Rating } from "@comenta/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ratings } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async } from "../../components/Async";

/**
 * Avaliações / NPS.
 *
 * `GET /ratings` já existia na API desde o Lote 4 e nenhuma tela consumia: as
 * notas que os clientes mandavam ficavam só no banco, e o painel mostrava
 * apenas a média no card de satisfação do dashboard.
 *
 * Duas janelas de tempo convivem aqui, e a tela diz qual é qual: as métricas do
 * topo são dos últimos 30 dias (é o que `ratingMetrics` calcula), e a lista é
 * das 50 avaliações mais recentes, sem corte de data.
 */

/** Faixas do NPS clássico, sobre a nota normalizada em 0–10. */
function bucketOf(normalized: number): "promotor" | "neutro" | "detrator" {
  if (normalized >= 9) return "promotor";
  if (normalized <= 6) return "detrator";
  return "neutro";
}

const BUCKET_COLOR = {
  promotor: "#16a34a",
  neutro: "#d97706",
  detrator: "#dc2626",
} as const;

/** Nota na escala em que foi dada, convertida para 0–10 — é assim que a API
 *  calcula as métricas, então a tela precisa classificar do mesmo jeito. */
function normalize(r: Rating): number {
  return r.scale > 0 ? (r.score / r.scale) * 10 : 0;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Filter = "todas" | "promotor" | "neutro" | "detrator";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "promotor", label: "Promotores (9–10)" },
  { value: "neutro", label: "Neutros (7–8)" },
  { value: "detrator", label: "Detratores (0–6)" },
];

export function RatingsPage() {
  const [filter, setFilter] = useState<Filter>("todas");
  const query = useQuery({ queryKey: keys.ratings, queryFn: ratings.list });

  const list = query.data?.data;

  // Distribuição por nota inteira 0–10 da lista carregada. Não sai da API
  // pronta, mas dá para derivar sem uma segunda chamada.
  const distribution = useMemo(() => {
    const counts = new Array<number>(11).fill(0);
    for (const r of list ?? []) {
      const n = Math.round(normalize(r));
      if (n >= 0 && n <= 10) counts[n] = (counts[n] ?? 0) + 1;
    }
    return counts.map((count, score) => ({ score, count }));
  }, [list]);

  const filtered = useMemo(
    () => (list ?? []).filter((r) => filter === "todas" || bucketOf(normalize(r)) === filter),
    [list, filter]
  );

  return (
    <>
      <h2>Avaliações</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Notas que os clientes mandam depois que a conversa é resolvida. Quem pede a nota é a
        automação do tipo <b>Avaliação</b> — se ela estiver desligada, nada chega aqui.
      </p>

      <Async {...query} onRetry={() => void query.refetch()}>
        {({ metrics }) => {
          const maxBucket = Math.max(1, ...distribution.map((d) => d.count));

          return (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <Kpi
                  icon="📈"
                  label="NPS (30 dias)"
                  value={metrics.nps != null ? String(metrics.nps) : "—"}
                  hint="% promotores − % detratores"
                  color={
                    metrics.nps == null ? "#94a3b8" : metrics.nps >= 50 ? "#16a34a" : "#d97706"
                  }
                />
                <Kpi
                  icon="⭐"
                  label="Nota média (30 dias)"
                  value={metrics.average != null ? `${metrics.average}/10` : "—"}
                  hint="normalizada para 0–10"
                  color="#f59e0b"
                />
                <Kpi
                  icon="🗳️"
                  label="Respostas (30 dias)"
                  value={metrics.count}
                  hint={`${list?.length ?? 0} na lista abaixo`}
                  color="#6d28d9"
                />
              </div>

              <div
                className="card"
                style={{ padding: 18, alignItems: "stretch", marginBottom: 16 }}
              >
                <div style={{ fontWeight: 700, marginBottom: 12 }}>
                  Distribuição das notas recentes
                </div>
                {(list?.length ?? 0) === 0 ? (
                  <p className="muted">Nenhuma avaliação recebida ainda.</p>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                    {distribution.map((d) => (
                      <div
                        key={d.score}
                        style={{ flex: 1, textAlign: "center", fontSize: 11 }}
                        title={`Nota ${d.score}: ${d.count}`}
                      >
                        <div style={{ height: 88, display: "flex", alignItems: "flex-end" }}>
                          <div
                            style={{
                              width: "100%",
                              height: `${(d.count / maxBucket) * 100}%`,
                              minHeight: d.count > 0 ? 3 : 0,
                              background: BUCKET_COLOR[bucketOf(d.score)],
                              borderRadius: "4px 4px 0 0",
                            }}
                          />
                        </div>
                        <div style={{ fontWeight: 700, marginTop: 4 }}>{d.count || ""}</div>
                        <div className="muted">{d.score}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={filter === f.value ? "" : "ghost"}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <p className="muted">Nenhuma avaliação nesta faixa.</p>
              ) : (
                <div className="card" style={{ padding: 0, alignItems: "stretch" }}>
                  {filtered.map((r) => {
                    const n = normalize(r);
                    const bucket = bucketOf(n);
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        <span
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: BUCKET_COLOR[bucket],
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {r.score}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>
                            {r.contactName ?? "Contato removido"}
                          </div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {r.agentName ? `Atendido por ${r.agentName}` : "Sem atendente"} ·{" "}
                            {r.score}/{r.scale}
                            {r.scale !== 10 && ` (≈ ${Math.round(n * 10) / 10}/10)`}
                          </div>
                        </div>
                        <span className="tag" style={{ color: BUCKET_COLOR[bucket] }}>
                          {bucket}
                        </span>
                        <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                          {fmtDate(r.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        }}
      </Async>
    </>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  hint: string;
  color: string;
}) {
  return (
    <div className="card" style={{ padding: 16, textAlign: "left", alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{value}</div>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
        {hint}
      </div>
    </div>
  );
}
