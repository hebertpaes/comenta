import type { Contact } from "@comenta/shared";

export interface ContactImportRow {
  name: string;
  phone?: string;
  email?: string;
}

/** Escapa um campo para CSV: aspas duplicadas e o valor entre aspas. */
function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function contactsToCsv(contacts: Contact[]): string {
  const rows = [
    ["Nome", "Telefone", "Email"],
    ...contacts.map((c) => [c.name, c.phone ?? "", c.email ?? ""]),
  ];
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/**
 * Lê um CSV de contatos. Aceita `,` ou `;` como separador (planilhas em
 * português costumam usar `;`) e detecta se a primeira linha é cabeçalho.
 */
export function parseContactsCsv(text: string): ContactImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const first = lines[0];
  if (!first) return [];

  const sep = first.includes(";") ? ";" : ",";
  const hasHeader = /nome|name|telefone|phone|email/.test(first.toLowerCase());

  return (hasHeader ? lines.slice(1) : lines)
    .map((line) => line.split(sep).map((c) => c.replace(/^"|"$/g, "").trim()))
    .map((cells) => ({
      name: cells[0] ?? "",
      phone: (cells[1] ?? "").replace(/\D/g, "") || undefined,
      email: cells[2] || undefined,
    }))
    .filter((c) => c.name);
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
