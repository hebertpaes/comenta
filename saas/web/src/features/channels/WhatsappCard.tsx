import type { Channel } from "@comenta/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { channels } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { ErrorBox } from "../../components/Async";
import { metaFor } from "./status";

interface Props {
  channel: Channel;
  isAdmin: boolean;
  onChanged: () => void;
}

/** Card de uma conexão de WhatsApp (QR real, status ao vivo). */
export function WhatsappCard({ channel, isAdmin, onChanged }: Props) {
  // Polling de 3s enquanto o card está montado, como antes — só que agora o
  // Query cancela sozinho ao desmontar e pausa com a aba em segundo plano.
  const statusQuery = useQuery({
    queryKey: keys.channelStatus(channel.id),
    queryFn: () => channels.status(channel.id),
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    initialData: {
      status: channel.status,
      qr: channel.live?.qr ?? null,
      phone: channel.live?.phone ?? (channel.config.phone as string | undefined) ?? null,
    },
  });

  const st = statusQuery.data;

  const connect = useMutation({
    mutationFn: () => channels.connect(channel.id),
    onSuccess: () => void statusQuery.refetch(),
  });

  const disconnect = useMutation({
    mutationFn: () => channels.disconnect(channel.id),
    onSuccess: () => {
      void statusQuery.refetch();
      onChanged();
    },
  });

  const remove = useMutation({
    mutationFn: () => channels.remove(channel.id),
    onSuccess: onChanged,
  });

  const sync = useMutation({
    mutationFn: () => channels.syncContacts(channel.id),
    onSuccess: onChanged,
  });

  const meta = metaFor(st.status);
  const busy = connect.isPending || disconnect.isPending;
  const actionError = connect.error ?? disconnect.error ?? remove.error ?? sync.error;

  return (
    <div
      className="card"
      style={{ padding: 18, textAlign: "left", alignItems: "stretch", maxWidth: 380 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>🟢</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{channel.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            WhatsApp {st.phone ? `· ${st.phone}` : ""}
          </div>
        </div>
        <span className="tag" style={{ background: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
      </div>

      {st.status === "connecting" && st.qr && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <img
            src={st.qr}
            alt="QR do WhatsApp"
            width={220}
            height={220}
            style={{ borderRadius: 12, background: "#fff", padding: 8 }}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> e aponte para o QR.
          </p>
        </div>
      )}
      {st.status === "connecting" && !st.qr && (
        <div className="aibox" style={{ marginTop: 12 }}>
          ⏳ Gerando QR Code…
        </div>
      )}
      {st.demo && (
        <p className="muted" style={{ fontSize: 11, marginTop: 10, opacity: 0.8 }}>
          Modo demonstração (sem a lib Baileys): pareamento simulado.
        </p>
      )}

      {actionError && <ErrorBox error={actionError} />}

      {sync.data && (
        <div className="aibox" style={{ marginTop: 12 }}>
          Agenda sincronizada: {sync.data.imported} novo(s), {sync.data.skipped} já existia(m).
        </div>
      )}

      {isAdmin && st.status === "connected" && (
        <div style={{ marginTop: 14 }}>
          <button
            className="ghost"
            style={{ width: "100%" }}
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            {sync.isPending
              ? "Sincronizando…"
              : `🔄 Sincronizar contatos${st.contactsAvailable ? ` (${st.contactsAvailable})` : ""}`}
          </button>
          <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
            Importa a agenda deste aparelho para os seus Contatos (não sobrescreve os já
            cadastrados).
          </p>
        </div>
      )}

      {isAdmin && (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {st.status === "connected" || st.status === "connecting" ? (
            <button disabled={busy} onClick={() => disconnect.mutate()}>
              {st.status === "connecting" ? "Cancelar" : "Desconectar"}
            </button>
          ) : (
            <button disabled={busy} onClick={() => connect.mutate()}>
              {connect.isPending ? "Gerando…" : "📲 Conectar"}
            </button>
          )}
          <button
            className="link"
            style={{ color: "#dc2626" }}
            onClick={() => {
              if (confirm(`Remover a conexão "${channel.name}"?`)) remove.mutate();
            }}
          >
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
