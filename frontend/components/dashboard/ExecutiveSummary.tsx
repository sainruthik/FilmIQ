"use client";

interface ExecutiveSummaryProps {
  summary: string;
}

export function ExecutiveSummary({ summary }: ExecutiveSummaryProps) {
  return (
    <div
      className="rounded-lg p-4 h-full"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border-strong)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--color-text-dim)" }}
      >
        Executive Summary
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--color-text-muted)" }}
      >
        {summary || "No summary available."}
      </p>
    </div>
  );
}
