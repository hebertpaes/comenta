import { useState } from "react";

/**
 * Caixa para um segredo que o servidor só devolve uma vez — a chave de API em
 * `POST /api-keys` e o secret de assinatura em `POST /webhooks`. Depois de
 * fechar, não há como recuperar: só criar outro. Por isso o aviso é explícito e
 * o botão de fechar exige uma ação, em vez de sumir sozinho.
 *
 * `navigator.clipboard` não existe em contexto não seguro (HTTP puro fora de
 * localhost, que é justamente o modo LAN do painel), então a falha é tratada:
 * o valor continua selecionável na tela.
 */
export function SecretOnce({
  label,
  value,
  onDismiss,
}: {
  label: string;
  value: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div
      className="card"
      role="alert"
      style={{
        padding: 16,
        marginBottom: 16,
        alignItems: "stretch",
        border: "1px solid #f59e0b",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ {label}</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Copie agora. Este valor não aparece de novo — se perder, é preciso criar outro.
      </p>
      <code
        style={{
          display: "block",
          padding: "10px 12px",
          borderRadius: 8,
          background: "var(--panel2)",
          border: "1px solid var(--border)",
          fontSize: 13,
          wordBreak: "break-all",
          userSelect: "all",
        }}
      >
        {value}
      </code>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => void copy()}>{copied ? "✅ Copiado" : "📋 Copiar"}</button>
        <button className="ghost" onClick={onDismiss}>
          Já guardei
        </button>
      </div>
      {copyFailed && (
        <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
          O navegador bloqueou a área de transferência. Selecione o texto acima e copie à mão.
        </p>
      )}
    </div>
  );
}
