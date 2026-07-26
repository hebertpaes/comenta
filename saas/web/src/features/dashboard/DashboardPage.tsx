import type { DashboardMetrics } from "@comenta/shared";
import { useQuery } from "@tanstack/react-query";
import { dashboard } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async } from "../../components/Async";
import { BarChart, Donut } from "../../components/charts";

interface Kpi {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

function kpisOf(m: DashboardMetrics): Kpi[] {
  return [
    { label: "Em atendimento", value: m.conversations.open, icon: "💬", color: "#2563eb" },
    { label: "Aguardando", value: m.conversations.pending, icon: "⏳", color: "#d97706" },
    { label: "Resolvidas", value: m.conversations.resolved, icon: "✅", color: "#16a34a" },
    { label: "Mensagens hoje", value: m.messagesToday, icon: "✉️", color: "#6d28d9" },
    { label: "Contatos", value: m.contacts, icon: "👥", color: "#0891b2" },
    {
      label: "1ª resposta (méd.)",
      value: m.avgFirstResponseSeconds != null ? `${Math.round(m.avgFirstResponseSeconds)}s` : "—",
      icon: "⚡",
      color: "#db2777",
    },
    {
      label: m.rating?.count ? `Satisfação (${m.rating.count} aval.)` : "Satisfação",
      value: m.rating?.average != null ? `${m.rating.average}/10` : "—",
      icon: "⭐",
      color: "#f59e0b",
    },
  ];
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: keys.metrics,
    queryFn: dashboard.metrics,
    // O painel antigo tinha um setInterval de 15s dentro de um useEffect;
    // aqui o próprio Query cuida disso e para de buscar quando a aba some.
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  return (
    <>
      <h2>Dashboard</h2>
      <Async {...query} onRetry={() => void query.refetch()}>
        {(m) => {
          const totalConv =
            m.conversations.open + m.conversations.pending + m.conversations.resolved;
          const maxQueue = Math.max(1, ...m.byQueue.map((q) => q.count));

          return (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {kpisOf(m).map((k) => (
                  <div
                    key={k.label}
                    className="card"
                    style={{ padding: 16, textAlign: "left", alignItems: "stretch" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{k.icon}</span>
                      <span
                        style={{ width: 8, height: 8, borderRadius: 999, background: k.color }}
                      />
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{k.value}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {k.label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div className="card" style={{ padding: 18, alignItems: "stretch" }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>
                    Mensagens (últimos 7 dias)
                  </div>
                  <BarChart data={m.messages7d} />
                </div>
                <div className="card" style={{ padding: 18, alignItems: "stretch" }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>Conversas por status</div>
                  <Donut
                    segments={[
                      { label: "Em atendimento", value: m.conversations.open, color: "#2563eb" },
                      { label: "Aguardando", value: m.conversations.pending, color: "#d97706" },
                      { label: "Resolvidas", value: m.conversations.resolved, color: "#16a34a" },
                    ]}
                  />
                </div>
              </div>

              {m.byQueue.length > 0 && (
                <div className="card" style={{ padding: 18, alignItems: "stretch", marginTop: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>Conversas por fila</div>
                  {m.byQueue.map((q) => (
                    <div
                      key={q.name}
                      style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}
                    >
                      <span style={{ width: 110, fontSize: 13 }}>{q.name}</span>
                      <div
                        style={{
                          flex: 1,
                          background: "#eef0f4",
                          borderRadius: 999,
                          height: 12,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(q.count / maxQueue) * 100}%`,
                            height: "100%",
                            background: q.color,
                          }}
                        />
                      </div>
                      <b style={{ width: 30, textAlign: "right", fontSize: 13 }}>{q.count}</b>
                    </div>
                  ))}
                </div>
              )}

              <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                Total de conversas: {totalConv} · atualiza a cada 15s.
              </p>
            </>
          );
        }}
      </Async>
    </>
  );
}
