import type { Queue, QueueSchedule, User } from "@comenta/shared";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queues as queuesApi } from "../../api/endpoints";
import { ErrorBox } from "../../components/Async";
import { QUEUE_COLORS, WEEK_DAYS } from "./constants";

interface Props {
  queue: Queue;
  users: User[];
  onChanged: () => void;
}

interface ScheduleForm {
  enabled: boolean;
  days: number[];
  start: string;
  end: string;
  message: string;
}

function scheduleOf(s: QueueSchedule): ScheduleForm {
  return {
    enabled: Boolean(s.enabled),
    days: s.days ?? [1, 2, 3, 4, 5],
    start: s.start ?? "09:00",
    end: s.end ?? "18:00",
    message: s.message ?? "",
  };
}

export function QueueCard({ queue, users, onChanged }: Props) {
  const [members, setMembers] = useState<string[]>(queue.memberIds);
  const [schedule, setSchedule] = useState<ScheduleForm>(() => scheduleOf(queue.schedule));

  const saveMembers = useMutation({
    mutationFn: () => queuesApi.setMembers(queue.id, members),
    onSuccess: onChanged,
  });
  const saveSchedule = useMutation({
    mutationFn: () => queuesApi.update(queue.id, { schedule }),
    onSuccess: onChanged,
  });
  const setColor = useMutation({
    mutationFn: (color: string) => queuesApi.update(queue.id, { color }),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => queuesApi.remove(queue.id),
    onSuccess: onChanged,
  });

  const toggleMember = (uid: string) =>
    setMembers((cur) => (cur.includes(uid) ? cur.filter((x) => x !== uid) : [...cur, uid]));

  const toggleDay = (d: number) =>
    setSchedule((s) => ({
      ...s,
      days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort(),
    }));

  const dirty = JSON.stringify([...members].sort()) !== JSON.stringify([...queue.memberIds].sort());

  const error = saveMembers.error ?? saveSchedule.error ?? setColor.error ?? remove.error;

  return (
    <div
      className="card"
      style={{ padding: 18, textAlign: "left", alignItems: "stretch", maxWidth: 360 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 14, height: 14, borderRadius: 4, background: queue.color }} />
        <div style={{ fontWeight: 700, flex: 1 }}>{queue.name}</div>
        {queue.schedule.enabled && (
          <span
            className="tag"
            style={{
              background: queue.isOpen ? "#dcfce7" : "#fee2e2",
              color: queue.isOpen ? "#16a34a" : "#dc2626",
            }}
          >
            {queue.isOpen ? "🟢 Aberto" : "🔴 Fechado"}
          </span>
        )}
        <button
          className="link"
          style={{ color: "#dc2626" }}
          onClick={() => {
            if (confirm(`Remover a fila "${queue.name}"?`)) remove.mutate();
          }}
        >
          Remover
        </button>
      </div>

      {error && <ErrorBox error={error} />}

      <div style={{ display: "flex", gap: 6, margin: "10px 0", flexWrap: "wrap" }}>
        {QUEUE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor.mutate(c)}
            title="cor da fila"
            aria-label={`Usar a cor ${c}`}
            style={{
              width: 18,
              height: 18,
              padding: 0,
              borderRadius: 4,
              background: c,
              border: 0,
              cursor: "pointer",
              outline: queue.color === c ? "2px solid #111" : "none",
            }}
          />
        ))}
      </div>

      <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
        Atendentes na fila:
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxHeight: 160,
          overflowY: "auto",
        }}
      >
        {users
          .filter((u) => u.role !== "admin" || members.includes(u.id))
          .map((u) => (
            <label
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={members.includes(u.id)}
                onChange={() => toggleMember(u.id)}
              />
              {u.name}
            </label>
          ))}
        {users.length === 0 && (
          <span className="muted" style={{ fontSize: 12 }}>
            Sem atendentes cadastrados.
          </span>
        )}
      </div>

      {dirty && (
        <button
          disabled={saveMembers.isPending}
          style={{ marginTop: 10, alignSelf: "flex-start" }}
          onClick={() => saveMembers.mutate()}
        >
          {saveMembers.isPending ? "Salvando…" : "Salvar membros"}
        </button>
      )}

      <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 12 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
          />
          🕐 Horário de atendimento
        </label>

        {schedule.enabled && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {WEEK_DAYS.map(([label, d]) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDay(d)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    fontSize: 12,
                    cursor: "pointer",
                    border: `1px solid ${schedule.days.includes(d) ? "var(--accent)" : "var(--border)"}`,
                    background: schedule.days.includes(d) ? "var(--accent)" : "transparent",
                    color: schedule.days.includes(d) ? "#fff" : "var(--text)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <label style={{ fontSize: 12, flex: 1 }}>
                Abre
                <input
                  type="time"
                  value={schedule.start}
                  onChange={(e) => setSchedule({ ...schedule, start: e.target.value })}
                />
              </label>
              <label style={{ fontSize: 12, flex: 1 }}>
                Fecha
                <input
                  type="time"
                  value={schedule.end}
                  onChange={(e) => setSchedule({ ...schedule, end: e.target.value })}
                />
              </label>
            </div>
            <textarea
              rows={2}
              value={schedule.message}
              onChange={(e) => setSchedule({ ...schedule, message: e.target.value })}
              placeholder="Mensagem fora do horário (o bot responde isso quando o time está fechado)"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--panel2)",
                color: "var(--text)",
                resize: "vertical",
              }}
            />
          </div>
        )}

        <button
          className="ghost"
          disabled={saveSchedule.isPending}
          style={{ marginTop: 8 }}
          onClick={() => saveSchedule.mutate()}
        >
          {saveSchedule.isPending ? "Salvando…" : "Salvar horário"}
        </button>
      </div>
    </div>
  );
}
