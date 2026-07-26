import type { Campaign, CampaignStatus } from "@comenta/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { campaigns } from "../../api/endpoints";
import type { CampaignAudience } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";

const STATUS_META: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Rascunho", color: "#64748b", bg: "#f1f5f9" },
  scheduled: { label: "Agendada", color: "#7c5cff", bg: "#ede9fe" },
  running: { label: "Enviando…", color: "#2563eb", bg: "#dbeafe" },
  done: { label: "Concluída", color: "#16a34a", bg: "#dcfce7" },
  canceled: { label: "Cancelada", color: "#dc2626", bg: "#fee2e2" },
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--panel2)",
  color: "var(--text)",
} as const;

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

function CampaignForm({
  audience,
  onCreate,
  isPending,
  error,
}: {
  audience: CampaignAudience | undefined;
  onCreate: (body: Record<string, unknown>) => Promise<unknown>;
  isPending: boolean;
  error: unknown;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "tag">("all");
  const [tag, setTag] = useState("");
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [validation, setValidation] = useState("");

  const tagEntries = Object.entries(audience?.tags ?? {});
  const estimated = target === "all" ? (audience?.totalWithPhone ?? 0) : (audience?.tags[tag] ?? 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setValidation("Dê um nome à campanha.");
    if (!message.trim()) return setValidation("Escreva a mensagem.");
    if (target === "tag" && !tag) return setValidation("Escolha uma tag para o público.");
    if (when === "schedule" && !scheduledAt)
      return setValidation("Escolha a data/hora do agendamento.");

    setValidation("");
    const body: Record<string, unknown> = {
      name: name.trim(),
      message: message.trim(),
      audience: target,
    };
    if (target === "tag") body.tag = tag;
    if (when === "schedule") body.scheduledAt = new Date(scheduledAt).toISOString();

    await onCreate(body);
    setName("");
    setMessage("");
    setScheduledAt("");
  };

  return (
    <form className="card" style={{ maxWidth: 520, padding: 20 }} onSubmit={submit}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Nova campanha</div>

      <div className="field">
        <label htmlFor="campaign-name">Nome</label>
        <input
          id="campaign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Promoção de julho"
        />
      </div>

      <div className="field">
        <label htmlFor="campaign-message">Mensagem</label>
        <textarea
          id="campaign-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Olá {nome}! Temos uma oferta especial pra você…"
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Use <b>{"{nome}"}</b> para personalizar com o nome do contato.
        </p>
      </div>

      <div className="field">
        <label htmlFor="campaign-audience">Público</label>
        <select
          id="campaign-audience"
          value={target}
          onChange={(e) => setTarget(e.target.value as "all" | "tag")}
          style={inputStyle}
        >
          <option value="all">
            Todos os contatos com telefone ({audience?.totalWithPhone ?? 0})
          </option>
          <option value="tag">Por tag</option>
        </select>
      </div>

      {target === "tag" && (
        <div className="field">
          <label htmlFor="campaign-tag">Tag</label>
          <select
            id="campaign-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            style={inputStyle}
          >
            <option value="">Escolha…</option>
            {tagEntries.map(([t, n]) => (
              <option key={t} value={t}>
                {t} ({n})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="campaign-when">Quando</label>
        <select
          id="campaign-when"
          value={when}
          onChange={(e) => setWhen(e.target.value as "now" | "schedule")}
          style={inputStyle}
        >
          <option value="now">Salvar como rascunho (envio pelo botão)</option>
          <option value="schedule">Agendar data/hora</option>
        </select>
      </div>

      {when === "schedule" && (
        <div className="field">
          <label htmlFor="campaign-at">Data e hora</label>
          <input
            id="campaign-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      <p className="muted" style={{ fontSize: 12 }}>
        Destinatários estimados: <b>{estimated}</b> contato(s).
      </p>

      {validation && (
        <div className="err" role="alert">
          {validation}
        </div>
      )}
      {error ? <ErrorBox error={error} /> : null}

      <button disabled={isPending} style={{ marginTop: 8 }}>
        {isPending ? "Salvando…" : "➕ Criar campanha"}
      </button>
    </form>
  );
}

export function CampaignsPage() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: keys.campaigns,
    queryFn: campaigns.list,
    // Acompanha o progresso do disparo em tempo quase real.
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: keys.campaigns });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => campaigns.create(body),
    onSuccess: reload,
  });
  const send = useMutation({
    mutationFn: (c: Campaign) => campaigns.send(c.id),
    onSuccess: reload,
  });
  const cancel = useMutation({
    mutationFn: (c: Campaign) => campaigns.cancel(c.id),
    onSuccess: reload,
  });
  const remove = useMutation({
    mutationFn: (c: Campaign) => campaigns.remove(c.id),
    onSuccess: reload,
  });

  const actionError = send.error ?? cancel.error ?? remove.error;

  return (
    <>
      <h2>Campanhas</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 640 }}>
        Dispare uma mensagem para uma lista de contatos — na hora ou agendada. A entrega usa o
        WhatsApp conectado; cada envio também fica registrado na conversa do contato. Sincronize a
        agenda em <b>Conexões</b> para ter mais contatos.
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <CampaignForm
          audience={query.data?.audience}
          onCreate={(body) => create.mutateAsync(body)}
          isPending={create.isPending}
          error={create.error}
        />

        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Suas campanhas</div>
          {actionError && <ErrorBox error={actionError} />}

          <Async {...query} onRetry={() => void query.refetch()}>
            {({ data: list }) =>
              list.length === 0 ? (
                <p className="muted">Nenhuma campanha ainda. Crie a primeira ao lado.</p>
              ) : (
                <>
                  {list.map((c) => {
                    const st = STATUS_META[c.status] ?? STATUS_META.draft;
                    const pct = c.total ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0;
                    return (
                      <div key={c.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, fontWeight: 600 }}>{c.name}</div>
                          <span className="tag" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </div>

                        <div
                          className="muted"
                          style={{ fontSize: 13, margin: "6px 0", whiteSpace: "pre-wrap" }}
                        >
                          {c.message.slice(0, 140)}
                        </div>

                        <div style={{ display: "flex", gap: 14, fontSize: 12 }} className="muted">
                          <span>👥 {c.total}</span>
                          <span style={{ color: "#16a34a" }}>✓ {c.sent}</span>
                          {c.failed > 0 && <span style={{ color: "#dc2626" }}>✗ {c.failed}</span>}
                          {c.filterTag && <span>🏷️ {c.filterTag}</span>}
                          {c.scheduledAt && <span>🕐 {formatDate(c.scheduledAt)}</span>}
                        </div>

                        {(c.status === "running" || c.status === "done") && (
                          <div
                            style={{
                              height: 6,
                              background: "var(--panel2)",
                              borderRadius: 6,
                              marginTop: 8,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: c.status === "done" ? "#16a34a" : "var(--accent)",
                              }}
                            />
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          {(c.status === "draft" || c.status === "scheduled") && (
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Disparar a campanha "${c.name}" para ${c.total} contato(s) agora?`
                                  )
                                )
                                  send.mutate(c);
                              }}
                            >
                              🚀 Enviar agora
                            </button>
                          )}
                          {(c.status === "scheduled" || c.status === "running") && (
                            <button
                              className="ghost"
                              onClick={() => {
                                if (confirm(`Cancelar a campanha "${c.name}"?`)) cancel.mutate(c);
                              }}
                            >
                              Cancelar
                            </button>
                          )}
                          {c.status !== "running" && (
                            <button
                              className="link"
                              style={{ color: "#dc2626" }}
                              onClick={() => {
                                if (confirm(`Remover a campanha "${c.name}"?`)) remove.mutate(c);
                              }}
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )
            }
          </Async>
        </div>
      </div>
    </>
  );
}
