import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { conversations } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { ErrorBox } from "../../components/Async";

/** Notas internas de uma conversa (visíveis só para a equipe). */
export function NotesPanel({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const notesQuery = useQuery({
    queryKey: keys.notes(conversationId),
    queryFn: () => conversations.notes(conversationId),
    // Só busca quando o painel está aberto, como na versão anterior.
    enabled: open,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.notes(conversationId) });

  const add = useMutation({
    mutationFn: (body: string) => conversations.addNote(conversationId, body),
    onSuccess: () => {
      setText("");
      void invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (noteId: string) => conversations.deleteNote(noteId),
    onSuccess: invalidate,
  });

  const notes = notesQuery.data?.data ?? [];

  const submit = () => {
    const body = text.trim();
    if (body) add.mutate(body);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button className="link" onClick={() => setOpen((o) => !o)}>
        🗒️ Notas internas {open ? "▲" : "▼"} {notes.length ? `(${notes.length})` : ""}
      </button>

      {open && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: 10,
            marginTop: 6,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Anotação visível só para a equipe…"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #d0d5dd" }}
            />
            <button onClick={submit} disabled={add.isPending}>
              {add.isPending ? "…" : "Anotar"}
            </button>
          </div>

          {add.error && <ErrorBox error={add.error} />}
          {notesQuery.error && <ErrorBox error={notesQuery.error} />}

          {notes.map((n) => (
            <div
              key={n.id}
              style={{ fontSize: 13, marginTop: 8, borderTop: "1px dashed #fde68a", paddingTop: 6 }}
            >
              <div>{n.body}</div>
              <div className="muted" style={{ fontSize: 11, display: "flex", gap: 8 }}>
                <span>{n.author ?? "—"}</span>
                <button
                  className="link"
                  style={{ color: "#dc2626", fontSize: 11 }}
                  onClick={() => remove.mutate(n.id)}
                >
                  remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
