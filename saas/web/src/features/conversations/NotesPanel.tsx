import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { conversations } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { ErrorBox } from "../../components/Async";

/** Painel de Anotações CRM estilo WAScript / Extension Overlay. */
export function NotesPanel({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  const notesQuery = useQuery({
    queryKey: keys.notes(conversationId),
    queryFn: () => conversations.notes(conversationId),
    enabled: open,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.notes(conversationId) });

  const add = useMutation({
    mutationFn: (body: string) => conversations.addNote(conversationId, body),
    onSuccess: () => {
      setText("");
      setDealValue("");
      setReminderDate("");
      void invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (noteId: string) => conversations.deleteNote(noteId),
    onSuccess: invalidate,
  });

  const notes = notesQuery.data?.data ?? [];

  const submit = () => {
    let body = text.trim();
    if (dealValue.trim()) {
      body += ` [💰 Valor: R$ ${dealValue.trim()}]`;
    }
    if (reminderDate) {
      body += ` [📅 Lembrete: ${reminderDate}]`;
    }

    if (body) add.mutate(body);
  };

  const handlePresetNote = (preset: string) => {
    setText(preset);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button className="link" onClick={() => setOpen((o) => !o)} style={{ fontSize: 12, fontWeight: 700 }}>
        🗒️ Anotações CRM & Lembretes (Estilo WAScript) {open ? "▲" : "▼"} {notes.length ? `(${notes.length})` : ""}
      </button>

      {open && (
        <div
          style={{
            background: "var(--panel2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 12,
            marginTop: 8,
          }}
        >
          {/* Presets Rápidos estilo WAScript Overlay */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", alignSelf: "center" }}>Atalhos:</span>
            {[
              "Interessado no Curso Operador de Caixa",
              "Aguardando Pagamento Hotmart",
              "Solicitou retorno por telefone",
              "Proposta comercial enviada"
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                className="ghost"
                onClick={() => handlePresetNote(preset)}
                style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6 }}
              >
                + {preset}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite a anotação interna visível para a equipe…"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, background: "var(--panel)", color: "var(--text)" }}
            />

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="💰 Valor Negócio (ex: 149,00)"
                style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--panel)", color: "var(--text)" }}
              />
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, background: "var(--panel)", color: "var(--text)" }}
              />
              <button onClick={submit} disabled={add.isPending} style={{ fontWeight: 700, padding: "6px 14px" }}>
                {add.isPending ? "…" : "Salvar Nota"}
              </button>
            </div>
          </div>

          {add.error && <ErrorBox error={add.error} />}
          {notesQuery.error && <ErrorBox error={notesQuery.error} />}

          {notes.map((n) => (
            <div
              key={n.id}
              style={{ fontSize: 13, marginTop: 10, borderTop: "1px dashed var(--border)", paddingTop: 8 }}
            >
              <div style={{ fontWeight: 600, color: "var(--text)" }}>{n.body}</div>
              <div className="muted" style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span>Por {n.author ?? "Atendente"}</span>
                <button
                  className="link"
                  style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}
                  onClick={() => remove.mutate(n.id)}
                >
                  Excluir Nota
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
