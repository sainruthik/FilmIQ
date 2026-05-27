"use client";

import { UploadZone } from "@/components/UploadZone";
import { FileText, Users, BarChart3, DollarSign, TrendingUp, ShieldAlert, Target } from "lucide-react";

const AGENTS = [
  { icon: FileText, name: "Document Analyst", desc: "Story · Genre · Budget · Rights" },
  { icon: Users, name: "Talent Researcher", desc: "Director · Cast value" },
  { icon: BarChart3, name: "Market Analyst", desc: "Streaming benchmarks · Comps" },
  { icon: DollarSign, name: "Deals Researcher", desc: "Acquisition pricing · Anchors" },
  { icon: TrendingUp, name: "Buzz Analyst", desc: "Festival buzz · Critic sentiment" },
  { icon: ShieldAlert, name: "Risk Analyst", desc: "Red flags · Risk register" },
  { icon: Target, name: "Acquisitions Strategist", desc: "Bid range · Final recommendation" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <header
        className="px-7 py-4 border-b flex items-center justify-between"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <h1 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-dim)" }}>
            Upload documents to begin an acquisition evaluation
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium"
            style={{
              background: "var(--color-accent-dim)",
              border: "1px solid var(--color-accent-border)",
              color: "var(--color-accent)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            7 Agents Ready
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Upload panel */}
        <div className="flex-1 flex flex-col items-center justify-center p-10 min-h-[500px]">
          <div className="w-full max-w-xl">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-text-dim)" }}
            >
              New Evaluation
            </p>
            <h2
              className="text-xl font-semibold mb-1"
              style={{ color: "var(--color-text)" }}
            >
              Upload acquisition documents
            </h2>
            <p
              className="text-sm mb-6 leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              Drop in any combination of press kits, scripts, financial summaries, or pitch decks.
              Seven specialist AI agents will analyze in parallel and return a structured bid-range report.
            </p>
            <UploadZone />
          </div>
        </div>

        {/* Agent roster panel */}
        <div
          className="w-64 shrink-0 border-l flex flex-col"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-dim)" }}
            >
              Specialist Team
            </p>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto">
            {AGENTS.map((agent, i) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.name}
                  className="px-4 py-3 flex items-start gap-3 border-b"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border-strong)",
                    }}
                  >
                    <Icon size={13} style={{ color: "var(--color-text-dim)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight" style={{ color: "var(--color-text)" }}>
                      {agent.name}
                    </p>
                    <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--color-text-dim)" }}>
                      {agent.desc}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[10px] font-semibold tabular-nums mt-0.5"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            className="px-4 py-2.5 border-t"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
              Analysis time: ~3–5 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
