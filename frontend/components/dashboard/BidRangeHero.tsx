"use client";

import { TrendingUp } from "lucide-react";
import type { BidRange } from "@/lib/types";

interface BidRangeHeroProps {
  bidRange: BidRange;
  filmTitle: string;
}

export function BidRangeHero({ bidRange, filmTitle }: BidRangeHeroProps) {
  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border-strong)",
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--color-text-dim)" }}
          >
            Recommended Bid Range
          </p>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
            {filmTitle}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium"
          style={{
            background: "var(--color-accent-dim)",
            border: "1px solid var(--color-accent-border)",
            color: "var(--color-accent)",
          }}
        >
          <TrendingUp size={11} />
          AI Analysis
        </div>
      </div>

      {/* Bid values */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <BidCell label="Floor" value={bidRange.low} variant="muted" />
        <BidCell label="Fair Value" value={bidRange.fair} variant="accent" featured />
        <BidCell label="Walk Away" value={bidRange.walkAway} variant="warning" />
      </div>

      {/* Justification */}
      {bidRange.justification && (
        <div
          className="rounded p-3 text-sm leading-relaxed"
          style={{
            background: "var(--color-surface-raised)",
            color: "var(--color-text-muted)",
            borderLeft: "2px solid var(--color-accent)",
          }}
        >
          {bidRange.justification}
        </div>
      )}
    </div>
  );
}

function BidCell({
  label,
  value,
  variant,
  featured = false,
}: {
  label: string;
  value: string;
  variant: "muted" | "accent" | "warning";
  featured?: boolean;
}) {
  const colors = {
    muted: { text: "var(--color-text-muted)", bg: "var(--color-surface-raised)", border: "var(--color-border)" },
    accent: { text: "var(--color-accent)", bg: "var(--color-accent-dim)", border: "var(--color-accent-border)" },
    warning: { text: "var(--color-warning)", bg: "var(--color-warning-dim)", border: "rgba(245,158,11,0.3)" },
  }[variant];

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--color-text-dim)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-semibold tabular-nums leading-tight"
        style={{ color: colors.text }}
      >
        {value || "—"}
      </p>
      {featured && (
        <p className="text-[10px]" style={{ color: "var(--color-text-dim)" }}>
          Recommended offer
        </p>
      )}
    </div>
  );
}
