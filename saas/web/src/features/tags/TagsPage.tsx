import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { tags } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";

const DEFAULT_COLOR = "#6d28d9";

export function TagsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);

  const query = useQuery({ queryKey: keys.tags, queryFn: tags.list });
  const reload = () => queryClient.invalidateQueries({ queryKey: keys.tags });

  const create = useMutation({
    mutationFn: (body: { name: string; color: string }) => tags.create(body),
    onSuccess: () => {
      setName("");
      setColor(DEFAULT_COLOR);
      void reload();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => tags.remove(id),
    onSuccess: reload,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) create.mutate({ name: trimmed, color });
  };

  return (
    <>
      <h2>Tags</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Etiquetas coloridas para classificar conversas (aplicadas no cabeçalho de cada conversa).
      </p>

      <form
        onSubmit={submit}
        className="card"
        style={{
          padding: 16,
          marginBottom: 18,
          maxWidth: 460,
          flexDirection: "row",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Cor da tag"
          style={{ width: 40, height: 38, border: "none", background: "none" }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da tag"
          aria-label="Nome da tag"
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }}
        />
        <button disabled={create.isPending}>{create.isPending ? "…" : "➕ Criar"}</button>
      </form>

      {(create.error ?? remove.error) && <ErrorBox error={create.error ?? remove.error} />}

      <Async {...query} onRetry={() => void query.refetch()}>
        {({ data: list }) =>
          list.length === 0 ? (
            <p className="muted">Nenhuma tag ainda.</p>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {list.map((t) => (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    padding: "8px 12px",
                    flexDirection: "row",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className="tag" style={{ background: t.color, color: "#fff" }}>
                    {t.name}
                  </span>
                  <button
                    className="link"
                    style={{ color: "#dc2626", fontSize: 12 }}
                    aria-label={`Remover a tag ${t.name}`}
                    onClick={() => {
                      if (confirm("Remover esta tag?")) remove.mutate(t.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )
        }
      </Async>
    </>
  );
}
