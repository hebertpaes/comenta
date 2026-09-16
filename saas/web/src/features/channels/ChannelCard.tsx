import type { Channel, ChannelCatalogEntry } from "@comenta/shared";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { channels } from "../../api/endpoints";
import { ErrorBox } from "../../components/Async";
import { CHANNEL_FIELDS, metaFor } from "./status";

interface Props {
  channel: Channel;
  meta: ChannelCatalogEntry | undefined;
  isAdmin: boolean;
  onChanged: () => void;
}

/** Card de um canal não-WhatsApp: encaixe pronto, aguardando credenciais. */
export function ChannelCard({ channel, meta, isAdmin, onChanged }: Props) {
  const fields = CHANNEL_FIELDS[channel.type] ?? [];

  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => {
        const value = channel.config[f.key];
        return [f.key, value == null ? "" : String(value)];
      })
    )
  );
  const [validation, setValidation] = useState("");

  // O widget do site já nasce ativo; para os demais, o status vem do banco.
  const status = channel.type === "widget" ? "connected" : channel.status;
  const sm = metaFor(status);
  const isLive = status === "connected" || status === "configured";

  const connect = useMutation({
    mutationFn: async () => {
      const cfg: Record<string, string> = {};
      for (const f of fields) {
        const v = form[f.key]?.trim();
        if (v) cfg[f.key] = v;
      }
      await channels.update(channel.id, { config: cfg });
      return channels.connect(channel.id);
    },
    onSuccess: onChanged,
  });

  const disconnect = useMutation({
    mutationFn: () => channels.disconnect(channel.id),
    onSuccess: onChanged,
  });

  const remove = useMutation({
    mutationFn: () => channels.remove(channel.id),
    onSuccess: onChanged,
  });

  const submitConnect = () => {
    const filled = fields.some((f) => form[f.key]?.trim());
    if (fields.length > 0 && !filled) {
      setValidation("Preencha as credenciais para conectar.");
      return;
    }
    setValidation("");
    connect.mutate();
  };

  const removeButton = (
    <button
      className="link"
      style={{ color: "#dc2626" }}
      onClick={() => {
        if (confirm(`Remover a conexão "${channel.name}"?`)) remove.mutate();
      }}
    >
      Remover
    </button>
  );

  return (
    <div
      className="card"
      style={{ padding: 18, textAlign: "left", alignItems: "stretch", maxWidth: 380 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>{meta?.icon ?? "🔌"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{channel.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {meta?.label ?? channel.type}
          </div>
        </div>
        <span className="tag" style={{ background: sm.bg, color: sm.color }}>
          {sm.label}
        </span>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        {meta?.help}
      </p>

      {validation && (
        <div className="err" role="alert">
          {validation}
        </div>
      )}
      {(connect.error ?? disconnect.error ?? remove.error) && (
        <ErrorBox error={connect.error ?? disconnect.error ?? remove.error} />
      )}

      {channel.type === "widget" ? (
        isAdmin && <div style={{ marginTop: 12 }}>{removeButton}</div>
      ) : isLive ? (
        isAdmin && (
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
              Desconectar
            </button>
            {removeButton}
          </div>
        )
      ) : isAdmin ? (
        <div style={{ marginTop: 12 }}>
          {fields.map((f) => (
            <div className="field" key={f.key} style={{ marginBottom: 8 }}>
              <label htmlFor={`${channel.id}-${f.key}`} style={{ fontSize: 12 }}>
                {f.label}
              </label>
              <input
                id={`${channel.id}-${f.key}`}
                type={f.type ?? "text"}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #d0d5dd",
                }}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button disabled={connect.isPending} onClick={submitConnect}>
              {connect.isPending ? "Conectando…" : "Conectar"}
            </button>
            {removeButton}
          </div>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Somente administradores configuram este canal.
        </p>
      )}
    </div>
  );
}
