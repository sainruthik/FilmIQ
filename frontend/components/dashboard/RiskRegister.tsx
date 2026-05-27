"use client";

import { Badge } from "@/components/ui/badge";
import type { RiskFlag } from "@/lib/types";
import { ShieldAlert } from "lucide-react";

interface RiskRegisterProps {
  risks: RiskFlag[];
}

function severityVariant(s: RiskFlag["severity"]) {
  if (s === "High") return "destructive" as const;
  if (s === "Medium") return "warning" as const;
  return "success" as const;
}

export function RiskRegister({ risks }: RiskRegisterProps) {
  const sorted = [...risks].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div
      className="rounded-lg p-4 h-full flex flex-col"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border-strong)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={13} style={{ color: "var(--color-text-dim)" }} />
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-dim)" }}
        >
          Risk Register
        </p>
        <span
          className="ml-auto text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
          style={{
            background: "var(--color-surface-raised)",
            color: "var(--color-text-dim)",
          }}
        >
          {risks.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
          No risks identified.
        </p>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {sorted.map((flag, i) => (
            <div
              key={i}
              className="rounded p-2.5 flex flex-col gap-1"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start gap-2">
                <Badge variant={severityVariant(flag.severity)} className="shrink-0 mt-0.5">
                  {flag.severity}
                </Badge>
                <p className="text-xs font-medium leading-snug" style={{ color: "var(--color-text)" }}>
                  {flag.risk}
                </p>
              </div>
              {flag.mitigation && (
                <p
                  className="text-[11px] leading-snug pl-0"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  ↳ {flag.mitigation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
