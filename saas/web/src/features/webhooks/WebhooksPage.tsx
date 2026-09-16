import type { WebhookCreated, WebhookEvent } from "@comenta/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { webhooks } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";
import { SecretOnce } from "../../components/SecretOnce";

/**
 * Webhooks de saída (só admin).
 *
 * `GET/POST/DELETE /webhooks` e `GET /webhooks/:id/deliveries` já existiam sem
 * nenhuma tela. O histórico de entregas é o que faz esta página valer: sem ele,
 * um webhook que falha em silêncio só apareceria nos logs do servidor.
 *
 * A lista de eventos vem do próprio servidor (`availableEvents`), não de uma
 * constante repetida aqui — assim um evento novo na API aparece na tela sem
 * mexer no painel.
 */

const EVENT_LABEL: Record<string, string> = {
  "conversation.created": "Conversa criada",
  "message.created": "Mensagem recebida ou enviada",
  "conversation.updated": "Conversa atualizada (status, fila, responsável)",
};

const STATUS_COLOR: Record<string, string> = {
  success: "#16a34a",
  pending: "#d97706",
  failed: "#dc2626",
};

export function WebhooksPage() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<WebhookEvent[]>([]);
  const [created, setCreated] = useState<WebhookCreated | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useQuery({ queryKey: keys.webhooks, queryFn: webhooks.list });
  const reload = () => queryClient.invalidateQueries({ queryKey: keys.webhooks });

  const create = useMutation({
    mutationFn: (body: { url: string; events: WebhookEvent[] }) =>
      webhooks.create(body.url, body.events),
    onSuccess: (row) => {
      setUrl("");
      setSelected([]);
      setCreated(row);
      void reload();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => webhooks.remove(id),
    onSuccess: () => {
      setOpenId(null);
      void reload();
    },
  });

  const toggleEvent = (ev: WebhookEvent) =>
    setSelected((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed && selected.length > 0) create.mutate({ url: trimmed, events: selected });
  };

  return (
    <>
      <h2>Webhooks</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        A cada evento, a API faz um <code>POST</code> no seu endereço com o payload em JSON. O corpo
        vai assinado em HMAC-SHA256 com o segredo mostrado na criação — confira a assinatura antes
        de confiar no conteúdo.
      </p>

      {created && (
        <SecretOnce
          label="Segredo de assinatura do webhook"
          value={created.secret}
          onDismiss={() => setCreated(null)}
        />
      )}

      <Async {...query} onRetry={() => void query.refetch()}>
        {({ data: list, availableEvents }) => (
          <>
            <form
              onSubmit={submit}
              className="card"
              style={{ padding: 16, marginBottom: 18, maxWidth: 620, alignItems: "stretch" }}
            >
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://seu-sistema.com/comenta/webhook"
                aria-label="URL do webhook"
                type="url"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #d0d5dd",
                  marginBottom: 12,
                }}
              />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Eventos</div>
              {availableEvents.map((ev) => (
                <label
                  key={ev}
                  style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                  />
                  <code>{ev}</code>
                  <span className="muted">{EVENT_LABEL[ev] ?? ""}</span>
                </label>
              ))}
              <button
                style={{ marginTop: 12, alignSelf: "flex-start" }}
                disabled={create.isPending || !url.trim() || selected.length === 0}
              >
                {create.isPending ? "…" : "➕ Criar webhook"}
              </button>
              {selected.length === 0 && (
                <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
                  Escolha ao menos um evento — um webhook sem eventos nunca dispara.
                </p>
              )}
            </form>

            {(create.error ?? remove.error) && <ErrorBox error={create.error ?? remove.error} />}

            {list.length === 0 ? (
              <p className="muted">Nenhum webhook configurado.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {list.map((w) => (
                  <div key={w.id} className="card" style={{ padding: 16, alignItems: "stretch" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, wordBreak: "break-all" }}>{w.url}</div>
                        <div style={{ marginTop: 6 }}>
                          {w.events.map((ev) => (
                            <span key={ev} className="tag">
                              {ev}
                            </span>
                          ))}
                          {!w.isActive && (
                            <span className="tag" style={{ color: "#dc2626" }}>
                              inativo
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="ghost"
                        onClick={() => setOpenId(openId === w.id ? null : w.id)}
                      >
                        {openId === w.id ? "Ocultar entregas" : "Ver entregas"}
                      </button>
                      <button
                        className="ghost"
                        style={{ color: "#dc2626" }}
                        onClick={() => {
                          if (confirm("Remover este webhook?")) remove.mutate(w.id);
                        }}
                      >
                        Remover
                      </button>
                    </div>
                    {openId === w.id && <Deliveries webhookId={w.id} />}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Async>
    </>
  );
}

/** Só monta quando o admin abre a linha — 50 entregas por webhook não precisam
 *  vir junto com a listagem. */
function Deliveries({ webhookId }: { webhookId: string }) {
  const query = useQuery({
    queryKey: keys.webhookDeliveries(webhookId),
    queryFn: () => webhooks.deliveries(webhookId),
  });

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      <Async {...query} onRetry={() => void query.refetch()} loadingLabel="Carregando entregas…">
        {({ data: list }) =>
          list.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              Nenhuma entrega registrada ainda.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr className="muted" style={{ textAlign: "left", fontSize: 12 }}>
                  <th style={{ padding: "4px 0" }}>Evento</th>
                  <th>Status</th>
                  <th>Tentativas</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 0" }}>
                      <code>{d.event}</code>
                    </td>
                    <td style={{ color: STATUS_COLOR[d.status] }}>
                      {d.status}
                      {d.lastError && (
                        <span className="muted" title={d.lastError}>
                          {" "}
                          ⓘ
                        </span>
                      )}
                    </td>
                    <td>{d.attempts}</td>
                    <td className="muted">{new Date(d.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </Async>
    </div>
  );
}
