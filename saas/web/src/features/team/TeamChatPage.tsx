import type { Listed, TeamMessage } from "@comenta/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { team } from "../../api/endpoints";
import { keys } from "../../api/keys";
import { useAuth } from "../../auth/useAuth";
import { ErrorBox } from "../../components/Async";

const time = (d: string) =>
  new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Chat interno da equipe — canal único da empresa, atendentes entre si. */
export function TeamChatPage() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const myId = me?.principal.userId;

  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  // A versão anterior fazia polling incremental com `after` e deduplicava à
  // mão. Aqui a lista inteira é recarregada a cada 3s: a API já limita a 100
  // mensagens, e o Query só re-renderiza quando o conteúdo muda de fato.
  const query = useQuery({
    queryKey: keys.teamMessages,
    queryFn: () => team.messages(),
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const messages = query.data?.data ?? [];
  const lastId = messages.at(-1)?.id;

  // Rola para o fim quando chega mensagem nova — não a cada re-render.
  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [lastId]);

  const send = useMutation({
    mutationFn: (body: string) => team.send(body),
    onSuccess: (msg) => {
      setText("");
      // Coloca a própria mensagem na lista na hora, sem esperar o próximo
      // polling — é o que faz o envio parecer instantâneo.
      queryClient.setQueryData<Listed<TeamMessage>>(keys.teamMessages, (old) =>
        old && !old.data.some((m) => m.id === msg.id) ? { ...old, data: [...old.data, msg] } : old
      );
    },
  });

  const submit = () => {
    const body = text.trim();
    if (body) send.mutate(body);
  };

  return (
    <>
      <h2>Chat da equipe</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, maxWidth: 620 }}>
        Canal interno entre os atendentes desta empresa. As mensagens aqui{" "}
        <b>não vão para o cliente</b> — é só para a equipe se coordenar.
      </p>

      {(query.error ?? send.error) && <ErrorBox error={query.error ?? send.error} />}

      <div className="thread" style={{ maxWidth: 720 }}>
        <div className="msgs" ref={boxRef}>
          {messages.length === 0 && (
            <p className="muted" style={{ margin: "auto" }}>
              Nenhuma mensagem ainda. Diga um oi para a equipe 👋
            </p>
          )}
          {messages.map((m) => {
            const mine = Boolean(m.userId) && m.userId === myId;
            return (
              <div
                key={m.id}
                className={`bubble ${mine ? "out" : "in"}`}
                style={{ maxWidth: "78%" }}
              >
                {!mine && (
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, opacity: 0.85 }}>
                    {m.userName ?? "Atendente"}
                  </div>
                )}
                <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
                <div style={{ fontSize: 10, opacity: 0.6, textAlign: "right", marginTop: 2 }}>
                  {time(m.createdAt)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="composer">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Escreva para a equipe…"
            aria-label="Mensagem para a equipe"
          />
          <button disabled={send.isPending || !text.trim()} onClick={submit}>
            Enviar
          </button>
        </div>
      </div>
    </>
  );
}
