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

  const query = useQuery({ queryKey: keys.channels, queryFn: channels.list });

  const reload = () => queryClient.invalidateQueries({ queryKey: keys.channels });

  const add = useMutation({
    mutationFn: (type: string) => channels.create(type),
    onSuccess: reload,
  });

  return (
    <>
      <h2>Conexões</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Conecte vários canais e vários números ao mesmo tempo. WhatsApp é conexão real (QR); os
        demais canais já têm o encaixe pronto para receber as credenciais.
      </p>

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
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Adicionar conexão</div>
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
