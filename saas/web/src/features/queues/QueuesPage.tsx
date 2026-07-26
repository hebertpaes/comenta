import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { queues as queuesApi, users as usersApi } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { Async, ErrorBox } from "../../components/Async";
import { QUEUE_COLORS } from "./constants";
import { QueueCard } from "./QueueCard";

export function QueuesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const query = useQuery({ queryKey: keys.queues, queryFn: queuesApi.list });
  const usersQuery = useQuery({ queryKey: keys.users, queryFn: usersApi.list });

  const reload = () => queryClient.invalidateQueries({ queryKey: keys.queues });

  const create = useMutation({
    mutationFn: (queueName: string) =>
      queuesApi.create({
        name: queueName,
        color: QUEUE_COLORS[(query.data?.data.length ?? 0) % QUEUE_COLORS.length],
      }),
    onSuccess: () => {
      setName("");
      void reload();
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) create.mutate(trimmed);
  };

  return (
    <>
      <h2>Filas</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 680 }}>
        Departamentos de atendimento (Suporte, Vendas…). Cada conversa pode ser transferida para uma
        fila, e cada fila tem seus atendentes. Filtre as conversas por fila na aba Conversas.
      </p>

      <form
        onSubmit={submit}
        className="card"
        style={{
          padding: 14,
          marginBottom: 18,
          maxWidth: 460,
          flexDirection: "row",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da nova fila (ex.: Cobrança)"
          aria-label="Nome da nova fila"
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d5dd" }}
        />
        <button disabled={create.isPending}>{create.isPending ? "…" : "➕ Criar fila"}</button>
      </form>

      {create.error && <ErrorBox error={create.error} />}

      <Async {...query} onRetry={() => void query.refetch()}>
        {({ data: list }) =>
          list.length === 0 ? (
            <p className="muted">Nenhuma fila ainda — crie a primeira acima.</p>
          ) : (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
              {list.map((q) => (
                <QueueCard
                  key={q.id}
                  queue={q}
                  users={usersQuery.data?.data ?? []}
                  onChanged={() => void reload()}
                />
              ))}
            </div>
          )
        }
      </Async>
    </>
  );
}
