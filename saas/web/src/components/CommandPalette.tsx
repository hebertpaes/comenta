import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { NAV, fold, searchNav } from "../app/nav";
import { conversations } from "../api/endpoints";
import { keys } from "../api/keys";

/**
 * Paleta de comandos (Ctrl/⌘ + K).
 *
 * Com dezoito telas na barra lateral, chegar em qualquer uma exigia procurar
 * com o olho numa lista de emojis. Aqui basta digitar. Além das telas, busca
 * conversas abertas pelo nome ou telefone do contato e pula direto para ela.
 *
 * A busca de conversas é local, sobre a primeira página que a API devolve
 * (`GET /conversations` não recebe termo de busca) — o rodapé diz isso, para
 * ninguém concluir que uma conversa antiga "sumiu".
 */

interface Item {
  key: string;
  label: string;
  hint?: string;
  onRun: () => void;
}

const MAX_CONVERSATIONS = 6;

interface Props {
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ isAdmin, open, onOpenChange }: Props) {
  const setOpen = onOpenChange;
  const [term, setTerm] = useState("");
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Atalho global. Fica no document porque precisa funcionar com o foco em
  // qualquer lugar — inclusive dentro do compositor de mensagem.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setTerm("");
      setCursor(0);
      inputRef.current?.focus();
    }
  }, [open]);

  // Só busca conversas com a paleta aberta: sem isso, toda tela do painel
  // carregaria a lista de conversas de graça.
  const convQuery = useQuery({
    queryKey: keys.conversations({}),
    queryFn: () => conversations.list({}),
    enabled: open,
  });

  const items = useMemo<Item[]>(() => {
    const pages = searchNav(
      NAV.filter((i) => !i.adminOnly || isAdmin),
      term
    ).map<Item>((i) => ({
      key: `nav:${i.to}`,
      label: i.label,
      hint: "Ir para",
      onRun: () => navigate(i.to),
    }));

    const t = fold(term.trim());
    const convs = t
      ? (convQuery.data?.data ?? [])
          .filter((c) => fold(`${c.contact.name} ${c.contact.phone ?? ""}`).includes(t))
          .slice(0, MAX_CONVERSATIONS)
          .map<Item>((c) => ({
            key: `conv:${c.id}`,
            label: `💬 ${c.contact.name}`,
            hint: c.contact.phone ?? c.status,
            onRun: () => navigate(`/conversas/${c.id}`),
          }))
      : [];

    return [...pages, ...convs];
  }, [term, isAdmin, convQuery.data, navigate]);

  // O cursor pode ficar além do fim quando o termo muda e a lista encolhe.
  const active = items.length === 0 ? -1 : Math.min(cursor, items.length - 1);

  if (!open) return null;

  const run = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    item.onRun();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) =>
        items.length === 0 ? 0 : (Math.min(c, items.length - 1) + 1) % items.length
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) =>
        items.length === 0 ? 0 : (Math.min(c, items.length - 1) - 1 + items.length) % items.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(items[active]);
    }
  };

  return (
    <div
      className="palette-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
        <input
          ref={inputRef}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar telas e conversas…"
          aria-label="Buscar telas e conversas"
          className="palette-input"
        />
        <div className="palette-list" role="listbox">
          {items.length === 0 ? (
            <div className="muted" style={{ padding: "12px 16px", fontSize: 13 }}>
              Nada encontrado para “{term}”.
            </div>
          ) : (
            items.map((item, i) => (
              <button
                key={item.key}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`palette-item${i === active ? " active" : ""}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => run(item)}
              >
                <span>{item.label}</span>
                {item.hint && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {item.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        <div className="palette-foot muted">
          ↑↓ navega · Enter abre · Esc fecha · conversas buscadas entre as{" "}
          {convQuery.data?.data.length ?? 0} mais recentes
        </div>
      </div>
    </div>
  );
}
