import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { AiClassification } from "../../api/endpoints";
import { ai } from "../../api/endpoints";

type Result =
  | { kind: "classify"; data: AiClassification }
  | { kind: "summary"; data: { summary: string } }
  | { kind: "suggest"; data: { suggestion: string } };

export function AiPanel({ conversationId }: { conversationId: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState<Result["kind"] | "">("");

  const mutation = useMutation({
    mutationFn: async (kind: Result["kind"]): Promise<Result> => {
      if (kind === "classify") return { kind, data: await ai.classify(conversationId) };
      if (kind === "summary") return { kind, data: await ai.summary(conversationId) };
      return { kind, data: await ai.suggest(conversationId) };
    },
    onSuccess: (r) => setResult(r),
    onError: (e: Error) => setError(e.message),
    onSettled: () => setRunning(""),
  });

  const run = (kind: Result["kind"]) => {
    setRunning(kind);
    setResult(null);
    setError("");
    mutation.mutate(kind);
  };

  const busy = running !== "";

  return (
    <div>
      <div className="aibar">
        <button disabled={busy} onClick={() => run("classify")}>
          {running === "classify" ? "…" : "🏷️ Classificar"}
        </button>
        <button disabled={busy} onClick={() => run("summary")}>
          {running === "summary" ? "…" : "📝 Resumir"}
        </button>
        <button disabled={busy} onClick={() => run("suggest")}>
          {running === "suggest" ? "…" : "✨ Sugerir resposta"}
        </button>
      </div>

      {error && (
        <div className="aibox" style={{ borderColor: "#ff6b6b" }} role="alert">
          IA: {error}
        </div>
      )}

      {result?.kind === "classify" && (
        <div className="aibox">
          <span className="tag">{result.data.category}</span>
          <span className="tag">{result.data.sentiment}</span>
          <span className="tag">urgência: {result.data.urgency}</span>
          <div style={{ marginTop: 8 }}>
            <b>{result.data.intent}</b> — {result.data.summary}
          </div>
        </div>
      )}
      {result?.kind === "summary" && <div className="aibox">{result.data.summary}</div>}
      {result?.kind === "suggest" && <div className="aibox">{result.data.suggestion}</div>}
    </div>
  );
}
