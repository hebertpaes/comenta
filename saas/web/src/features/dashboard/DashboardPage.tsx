import type { DashboardMetrics } from "@comenta/shared";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { dashboard } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async } from "../../components/Async";
import { BarChart, Donut } from "../../components/charts";

interface KpiItem {
  id: string;
  label: string;
  value: string | number;
  icon: string;
  color: string;
  hidden?: boolean;
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: keys.metrics,
    queryFn: dashboard.metrics,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "month">("7d");
  const [isEditing, setIsEditing] = useState(false);
  const [shareNotice, setShareNotice] = useState(false);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Estados locais editáveis de KPIs
  const [customKpis, setCustomKpis] = useState<KpiItem[]>([
    { id: "open", label: "Em Atendimento", value: 18, icon: "💬", color: "#2563eb" },
    { id: "pending", label: "Aguardando / Triagem", value: 5, icon: "⏳", color: "#d97706" },
    { id: "resolved", label: "Conversas Resolvidas", value: 142, icon: "✅", color: "#16a34a" },
    { id: "sales", label: "Vendas Hotmart / ABACS", value: "R$ 14.890,00", icon: "💰", color: "#10b981" },
    { id: "ai_rate", label: "Atendimentos por IA", value: "88.4%", icon: "🤖", color: "#6d28d9" },
    { id: "messages", label: "Mensagens Disparadas Hoje", value: 890, icon: "✉️", color: "#8b5cf6" },
    { id: "contacts", label: "Leads / Contatos Totais", value: 1240, icon: "👥", color: "#0891b2" },
    { id: "tma", label: "1ª Resposta (Méd.)", value: "14s", icon: "⚡", color: "#db2777" },
    { id: "csat", label: "Satisfação CSAT (NPS)", value: "9.8 / 10", icon: "⭐", color: "#f59e0b" }
  ]);

  const toggleKpiVisibility = (id: string) => {
    setCustomKpis((prev) =>
      prev.map((k) => (k.id === id ? { ...k, hidden: !k.hidden } : k))
    );
  };

  const handleEditKpiLabel = (id: string, newLabel: string) => {
    setCustomKpis((prev) =>
      prev.map((k) => (k.id === id ? { ...k, label: newLabel } : k))
    );
  };

  // Função para exportar / baixar relatório em formato visual (Print/PDF)
  const handleDownloadReport = () => {
    window.print();
  };

  // Função para copiar dados no formato CSV
  const handleExportCSV = () => {
    let csv = "Indicador,Valor\n";
    customKpis.filter(k => !k.hidden).forEach((k) => {
      csv += `"${k.label}","${k.value}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_dashboard_comenta_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compartilhar Resumo no WhatsApp / Copiar Link
  const handleShareDashboard = () => {
    const summaryText = `📊 *RESUMO EXECUTIVO COMENTA SAAS*\n\n` +
      customKpis.filter(k => !k.hidden).map(k => `• *${k.label}*: ${k.value}`).join("\n") +
      `\n\n🌐 Acesse: http://localhost:8080/dashboard`;

    navigator.clipboard.writeText(summaryText);
    setShareNotice(true);
    setTimeout(() => setShareNotice(false), 3500);
  };

  return (
    <div ref={dashboardRef} style={{ paddingBottom: 40 }}>
      {/* Top Header do Dashboard Editável */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>📊 Dashboard Executivo & Métricas de Desempenho</h2>
          <p className="muted" style={{ marginTop: -8, marginBottom: 0 }}>
            Visão geral de atendimentos, conversões de vendas Hotmart/ABACS e performance de IA.
          </p>
        </div>

        {/* Barra de Ações Rápidas: Editar, Filtrar, Baixar & Compartilhar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Filtro por Período */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            style={{ width: "auto", padding: "8px 12px", fontSize: 13, background: "var(--panel)" }}
          >
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="month">Mês Atual</option>
          </select>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            style={{
              background: isEditing ? "#10b981" : "var(--panel2)",
              color: isEditing ? "#fff" : "var(--text)",
              border: "1px solid var(--border)",
              fontSize: 13,
              fontWeight: 700
            }}
          >
            {isEditing ? "✓ Concluir Edição" : "✏️ Personalizar Dashboard"}
          </button>

          <button
            type="button"
            onClick={handleDownloadReport}
            className="ghost"
            style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            📥 Imprimir / PDF
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="ghost"
            style={{ fontSize: 13, fontWeight: 700 }}
          >
            📊 CSV
          </button>

          <button
            type="button"
            onClick={handleShareDashboard}
            style={{ background: "#6d28d9", color: "#fff", fontSize: 13, fontWeight: 700 }}
          >
            🔗 Compartilhar
          </button>
        </div>
      </div>

      {shareNotice && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(109, 40, 217, 0.15)", border: "1px solid #6d28d9", color: "#a855f7", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ✓ Resumo executivo copiado para a área de transferência! Cole no WhatsApp ou E-mail.
        </div>
      )}

      {/* Painel de Edição de KPIs */}
      {isEditing && (
        <div className="card" style={{ padding: 16, marginBottom: 20, background: "rgba(109, 40, 217, 0.08)", border: "2px dashed #6d28d9" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#a855f7" }}>
            ⚙️ Modo de Edição Ativo: Marque os cartões visíveis e altere os nomes dos indicadores:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {customKpis.map((kpi) => (
              <div key={kpi.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--panel)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                <input
                  type="checkbox"
                  checked={!kpi.hidden}
                  onChange={() => toggleKpiVisibility(kpi.id)}
                  style={{ width: 16, height: 16 }}
                />
                <input
                  type="text"
                  value={kpi.label}
                  onChange={(e) => handleEditKpiLabel(kpi.id, e.target.value)}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <Async {...query} onRetry={() => void query.refetch()}>
        {(m) => {
          const totalConv = (m?.conversations?.open || 0) + (m?.conversations?.pending || 0) + (m?.conversations?.resolved || 0);
          const maxQueue = Math.max(1, ...(m?.byQueue || []).map((q) => q.count));

          // Atualiza dados reais nos KPIs locais
          const activeKpis = customKpis.map(k => {
            if (k.id === "open") return { ...k, value: m.conversations.open };
            if (k.id === "pending") return { ...k, value: m.conversations.pending };
            if (k.id === "resolved") return { ...k, value: m.conversations.resolved };
            if (k.id === "messages") return { ...k, value: m.messagesToday };
            if (k.id === "contacts") return { ...k, value: m.contacts };
            if (k.id === "tma" && m.avgFirstResponseSeconds != null) return { ...k, value: `${Math.round(m.avgFirstResponseSeconds)}s` };
            if (k.id === "csat" && m.rating?.average != null) return { ...k, value: `${m.rating.average}/10` };
            return k;
          });

          return (
            <>
              {/* Grid de KPIs Editáveis */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                {activeKpis.filter(k => !k.hidden).map((k) => (
                  <div
                    key={k.id}
                    className="card"
                    style={{ padding: 18, textAlign: "left", alignItems: "stretch", position: "relative" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{k.icon}</span>
                      <span
                        style={{ width: 10, height: 10, borderRadius: 999, background: k.color }}
                      />
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, letterSpacing: "-0.5px" }}>{k.value}</div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                      {k.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Gráficos Visuais */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div className="card" style={{ padding: 20, alignItems: "stretch" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>
                      📈 Volume Mensagens por Dia (Últimos 7 Dias)
                    </div>
                    <span className="tag" style={{ fontSize: 10 }}>Tempo Real</span>
                  </div>
                  <BarChart data={m.messages7d} />
                </div>

                <div className="card" style={{ padding: 20, alignItems: "stretch" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>
                    🍩 Status dos Atendimentos
                  </div>
                  <Donut
                    segments={[
                      { label: "Em atendimento", value: m.conversations.open, color: "#2563eb" },
                      { label: "Aguardando", value: m.conversations.pending, color: "#d97706" },
                      { label: "Resolvidas", value: m.conversations.resolved, color: "#16a34a" },
                    ]}
                  />
                </div>
              </div>

              {/* Atendimentos por Fila */}
              {(m.byQueue || []).length > 0 && (
                <div className="card" style={{ padding: 20, alignItems: "stretch", marginTop: 18 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                    🗂️ Distribuição por Fila / Departamento
                  </div>
                  {m.byQueue.map((q) => (
                    <div
                      key={q.name}
                      style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}
                    >
                      <span style={{ width: 140, fontSize: 13, fontWeight: 600 }}>{q.name}</span>
                      <div
                        style={{
                          flex: 1,
                          background: "var(--panel2)",
                          borderRadius: 999,
                          height: 14,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(q.count / maxQueue) * 100}%`,
                            height: "100%",
                            background: q.color,
                            borderRadius: 999,
                          }}
                        />
                      </div>
                      <b style={{ width: 40, textAlign: "right", fontSize: 13 }}>{q.count}</b>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                  Total de Atendimentos: <b>{totalConv}</b> · Sincronização automática a cada 15 segundos.
                </p>
                <span className="muted" style={{ fontSize: 11 }}>
                  Comenta SaaS Executivo v2.0
                </span>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}
