import type { Source } from "@/lib/trade";

export function CitationChip({ source }: { source: Source }) {
  return (
    <span className={`citation-chip ${source.type === "pdf" ? "citation-chip-pdf" : "citation-chip-web"}`}>
      {source.label}
    </span>
  );
}
