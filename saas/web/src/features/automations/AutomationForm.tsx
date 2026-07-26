import type { AutomationType } from "@comenta/shared";
import { AUTOMATION_TYPES } from "@comenta/shared";
import { useState } from "react";
import type { FormEvent } from "react";
import { ErrorBox } from "../../components/Async";
import { AUTOMATION_TYPE_META, WEEKDAYS } from "./types";

export interface NewAutomation {
  name: string;
  type: AutomationType;
  config: Record<string, unknown>;
}

interface Props {
  onCreate: (body: NewAutomation) => Promise<unknown>;
  isPending: boolean;
  error: unknown;
}

const textareaStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--panel2)",
  color: "var(--text)",
  resize: "vertical",
} as const;

/** Formulário de criação de uma nova regra (bot de fluxo). */
export function AutomationForm({ onCreate, isPending, error }: Props) {
  const [type, setType] = useState<AutomationType>("ai");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [keywords, setKeywords] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [knowledge, setKnowledge] = useState("");
  const [tone, setTone] = useState("");
  const [handoffMessage, setHandoffMessage] = useState("");
  const [scale, setScale] = useState(10);
  const [thanks, setThanks] = useState("");
  const [validation, setValidation] = useState("");

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  /** Devolve a config da regra, ou uma mensagem de erro de validação. */
  const buildConfig = (): { config: Record<string, unknown> } | { error: string } => {
    switch (type) {
      case "welcome":
        if (!message.trim()) return { error: "Escreva a mensagem de boas-vindas." };
        return { config: { message: message.trim() } };

      case "business_hours":
        if (!message.trim()) return { error: "Escreva a mensagem de fora do horário." };
        if (days.length === 0) return { error: "Escolha ao menos um dia de atendimento." };
        return { config: { days, start, end, message: message.trim() } };

      case "keyword": {
        const kws = keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        if (kws.length === 0) return { error: "Informe ao menos uma palavra-chave." };
        if (!reply.trim()) return { error: "Escreva a resposta da regra." };
        return { config: { keywords: kws, reply: reply.trim() } };
      }

      case "ai":
        if (!knowledge.trim())
          return { error: "Escreva a base de conhecimento (o que a IA pode dizer)." };
        return {
          config: {
            knowledge: knowledge.trim(),
            ...(tone.trim() ? { tone: tone.trim() } : {}),
            ...(handoffMessage.trim() ? { handoffMessage: handoffMessage.trim() } : {}),
          },
        };

      case "rating":
        return {
          config: {
            scale: Number(scale),
            ...(message.trim() ? { message: message.trim() } : {}),
            ...(thanks.trim() ? { thanks: thanks.trim() } : {}),
          },
        };
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setValidation("");

    const built = buildConfig();
    if ("error" in built) {
      setValidation(built.error);
      return;
    }

    await onCreate({
      name: name.trim() || AUTOMATION_TYPE_META[type].label,
      type,
      config: built.config,
    });

    setName("");
    setMessage("");
    setReply("");
    setKeywords("");
    setKnowledge("");
    setTone("");
    setHandoffMessage("");
    setThanks("");
  };

  return (
    <form className="card" style={{ maxWidth: 520, padding: 20 }} onSubmit={submit}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Nova regra</div>

      <div className="field">
        <label htmlFor="automation-type">Tipo</label>
        <select
          id="automation-type"
          value={type}
          onChange={(e) => setType(e.target.value as AutomationType)}
          style={{ ...textareaStyle, resize: undefined }}
        >
          {AUTOMATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {AUTOMATION_TYPE_META[t].icon} {AUTOMATION_TYPE_META[t].label}
            </option>
          ))}
        </select>
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          {AUTOMATION_TYPE_META[type].hint}
        </p>
      </div>

      <div className="field">
        <label htmlFor="automation-name">Nome (opcional)</label>
        <input
          id="automation-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={AUTOMATION_TYPE_META[type].label}
        />
      </div>

      {type === "ai" && (
        <>
          <div className="field">
            <label htmlFor="knowledge">
              Base de conhecimento (o que a IA sabe e pode responder)
            </label>
            <textarea
              id="knowledge"
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
              rows={6}
              placeholder={
                "Ex.: Somos a Comenta, atendimento com IA.\nPlanos: Free (R$0), Pro (R$99/mês), Business (R$299/mês).\nHorário: seg–sex, 9h–18h.\nA IA deve usar SÓ estas informações; se não souber, transfere para humano."
              }
              style={textareaStyle}
            />
          </div>
          <div className="field">
            <label htmlFor="tone">Tom de voz (opcional)</label>
            <input
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="cordial, objetivo e prestativo"
            />
          </div>
          <div className="field">
            <label htmlFor="handoff">Mensagem ao transferir para humano (opcional)</label>
            <input
              id="handoff"
              value={handoffMessage}
              onChange={(e) => setHandoffMessage(e.target.value)}
              placeholder="Certo! Vou te transferir para um atendente humano. 🙂"
            />
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            A IA responde o cliente sozinha e transfere para um humano quando o cliente pede ou
            quando o caso foge da base. Requer a <b>ANTHROPIC_API_KEY</b> configurada — sem ela a IA
            fica inativa.
          </p>
        </>
      )}

      {type === "rating" && (
        <>
          <div className="field">
            <label htmlFor="scale">Escala</label>
            <select
              id="scale"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              style={{ ...textareaStyle, resize: undefined }}
            >
              <option value={10}>0 a 10 (NPS)</option>
              <option value={5}>1 a 5 (estrelas)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="rating-message">Mensagem do pedido de nota (opcional)</label>
            <textarea
              id="rating-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder={`De 0 a ${scale}, como você avalia nosso atendimento? Responda apenas com o número. 🙏`}
              style={textareaStyle}
            />
          </div>
          <div className="field">
            <label htmlFor="thanks">Agradecimento (opcional)</label>
            <input
              id="thanks"
              value={thanks}
              onChange={(e) => setThanks(e.target.value)}
              placeholder="Obrigado pela sua avaliação! 💜"
            />
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Ao resolver uma conversa, o cliente recebe o pedido de nota. A próxima resposta numérica
            dele (em até 24h) vira uma avaliação.
          </p>
        </>
      )}

      {type === "keyword" && (
        <>
          <div className="field">
            <label htmlFor="keywords">Palavras-chave (separadas por vírgula)</label>
            <input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="preço, valor, planos, quanto custa"
            />
          </div>
          <div className="field">
            <label htmlFor="reply">Resposta</label>
            <textarea
              id="reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Nossos planos: Free, Pro e Business…"
              style={textareaStyle}
            />
          </div>
        </>
      )}

      {(type === "welcome" || type === "business_hours") && (
        <>
          {type === "business_hours" && (
            <>
              <div className="field">
                <label>Dias de atendimento</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {WEEKDAYS.map(([label, d]) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDay(d)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 999,
                        fontSize: 13,
                        cursor: "pointer",
                        border: `1px solid ${days.includes(d) ? "#6d28d9" : "#d0d5dd"}`,
                        background: days.includes(d) ? "#6d28d9" : "#fff",
                        color: days.includes(d) ? "#fff" : "#333",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="start">Abre</label>
                  <input
                    id="start"
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="end">Fecha</label>
                  <input
                    id="end"
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="message">Mensagem</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={
                type === "welcome"
                  ? "Olá! 👋 Recebemos sua mensagem e já vamos te atender."
                  : "Estamos fora do horário (seg–sex, 9h–18h). Retornamos em breve!"
              }
              style={textareaStyle}
            />
          </div>
        </>
      )}

      {validation && (
        <div className="err" role="alert">
          {validation}
        </div>
      )}
      {error ? <ErrorBox error={error} /> : null}

      <button disabled={isPending} style={{ marginTop: 8 }}>
        {isPending ? "Salvando…" : "➕ Criar regra"}
      </button>
    </form>
  );
}
