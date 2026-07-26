import type { ReactNode } from "react";
import { ApiError } from "../lib/http";

/**
 * Estados de carregamento e erro num componente só.
 *
 * No painel antigo cada tela fazia `.catch(() => {})`: quando a API falhava, a
 * lista simplesmente ficava vazia e o usuário não tinha como saber se não havia
 * dados ou se algo tinha quebrado. Aqui o erro aparece, com o motivo.
 */

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <p className="muted" role="status">
      {label}
    </p>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Erro inesperado";
  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    <div className="err" role="alert">
      {forbidden ? "Você não tem permissão para ver isto." : message}
      {onRetry && !forbidden && (
        <>
          {" "}
          <button type="button" className="link" onClick={onRetry}>
            tentar de novo
          </button>
        </>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}

interface AsyncProps<T> {
  isPending: boolean;
  error: unknown;
  data: T | undefined;
  onRetry?: () => void;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}

/** Renderiza `children` só quando os dados chegaram; até lá mostra carregando
 *  ou o erro. Evita repetir o mesmo `if` em cada tela. */
export function Async<T>({
  isPending,
  error,
  data,
  onRetry,
  loadingLabel,
  children,
}: AsyncProps<T>) {
  if (error) return <ErrorBox error={error} onRetry={onRetry} />;
  if (isPending || data === undefined) return <Loading label={loadingLabel} />;
  return <>{children(data)}</>;
}
