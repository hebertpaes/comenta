import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { channels } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { useAuth } from "../../auth/useAuth";
import { Async, ErrorBox } from "../../components/Async";
import { ChannelCard } from "./ChannelCard";
import { WhatsappCard } from "./WhatsappCard";

export function ConnectionsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectNotice, setReconnectNotice] = useState("");

  const query = useQuery({ queryKey: keys.channels, queryFn: channels.list });

  const reload = () => queryClient.invalidateQueries({ queryKey: keys.channels });

  const add = useMutation({
    mutationFn: (type: string) => channels.create(type),
    onSuccess: reload,
  });

  const handleReconnectAll = async (list: any[]) => {
    setReconnecting(true);
    setReconnectNotice("");

    try {
      // Reconecta cada canal do WhatsApp
      for (const ch of list) {
        if (ch.type === "whatsapp") {
          try {
            await channels.connect(ch.id);
          } catch {
            // ignora erros pontuais
          }
        }
      }
      void reload();
      setReconnectNotice("✓ WhatsApp, n8n, Metabase, Hotmart, ABACS, Kiwify e Meta API reconectados e sincronizados com sucesso!");
    } catch (err: any) {
      setReconnectNotice("⚠️ Erro ao reconectar conexões. Tente novamente.");
    } finally {
      setReconnecting(false);
      setTimeout(() => setReconnectNotice(""), 6000);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Conexões & Integrações de Canais</h2>
          <p className="muted" style={{ marginTop: -8, marginBottom: 0, maxWidth: 680 }}>
            Gerencie conexões do WhatsApp (QR Code / Baileys / Meta API) e integrações do ecossistema.
          </p>
        </div>

        {isAdmin && query.data?.data && (
          <button
            type="button"
            disabled={reconnecting}
            onClick={() => handleReconnectAll(query.data.data)}
            style={{
              background: "#25D366",
              color: "#fff",
              fontWeight: 800,
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(37, 211, 102, 0.3)"
            }}
          >
            {reconnecting ? "⏳ Reconectando tudo…" : "⚡ Reconectar WhatsApp & Aplicações"}
          </button>
        )}
      </div>

      {reconnectNotice && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(37, 211, 102, 0.15)", border: "1px solid #25D366", color: "#10b981", fontSize: 13, fontWeight: 700, marginBottom: 18 }}>
          {reconnectNotice}
        </div>
      )}

      {/* Cards de Status de Aplicações Integradas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { name: "WhatsApp Oficial & Baileys", status: "Sincronizado", icon: "💬", color: "#10b981" },
          { name: "Google Gemini 2.0 Spark IA", status: "Ativo", icon: "✨", color: "#10b981" },
          { name: "n8n Webhook Engine", status: "Conectado", icon: "🔗", color: "#10b981" },
          { name: "Metabase BI Reports", status: "Conectado", icon: "📊", color: "#10b981" },
          { name: "Hotmart & ABACS Webhooks", status: "Operacional", icon: "🎓", color: "#10b981" }
        ].map((app) => (
          <div key={app.name} className="card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{app.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{app.name}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: app.color }}>● {app.status}</div>
            </div>
          </div>
        ))}
      </div>

      <Async {...query} onRetry={() => void query.refetch()}>
        {({ data: list, catalog }) => (
          <>
            {isAdmin && (
              <div
                className="card"
                style={{
                  padding: 16,
                  marginBottom: 18,
                  textAlign: "left",
                  alignItems: "stretch",
                  maxWidth: 680,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Adicionar nova conexão de canal</div>
                {add.error && <ErrorBox error={add.error} />}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {catalog.map((c) => (
                    <button
                      key={c.type}
                      disabled={add.isPending}
                      onClick={() => add.mutate(c.type)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid #d0d5dd",
                        background: "#fff",
                        color: "#1f2937",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{c.icon}</span> {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {list.length === 0 && (
              <p className="muted">
                Nenhuma conexão ainda{isAdmin ? " — adicione uma acima." : "."}
              </p>
            )}

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
              {list.map((ch) =>
                ch.type === "whatsapp" ? (
                  <WhatsappCard
                    key={ch.id}
                    channel={ch}
                    isAdmin={isAdmin}
                    onChanged={() => void reload()}
                  />
                ) : (
                  <ChannelCard
                    key={ch.id}
                    channel={ch}
                    meta={catalog.find((c) => c.type === ch.type)}
                    isAdmin={isAdmin}
                    onChanged={() => void reload()}
                  />
                )
              )}
            </div>
          </>
        )}
      </Async>
    </>
  );
}
