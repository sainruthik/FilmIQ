import { AGENTS } from "@/lib/agents";
import type { AgentInfo, AgentStatus } from "@/lib/useAnalysis";

const LABEL: Record<AgentStatus, string> = { done: "Finished", running: "Working", waiting: "Waiting" };

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "done")
    return (
      <svg viewBox="0 0 20 20" className="w-5 h-5 shrink-0" aria-hidden>
        <circle cx="10" cy="10" r="9" fill="currentColor" />
        <path d="M6 10.5l2.5 2.5L14 7.5" stroke="var(--paper)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "running")
    return (
      <svg viewBox="0 0 20 20" className="w-5 h-5 shrink-0 animate-spin [animation-duration:1.1s]" aria-hidden>
        <circle cx="10" cy="10" r="8" stroke="var(--rule)" strokeWidth="2" fill="none" />
        <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5 shrink-0" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
    </svg>
  );
}

interface AnalystRowsProps {
  agents: AgentInfo[];
  /** Index range into AGENTS; defaults to all seven. */
  from?: number;
  to?: number;
  className?: string;
  /** Always use the one-column mobile layout (narrow sidebars). */
  stacked?: boolean;
}

// One row per analyst: status, name, what it covers. Rows instead of cards so
// 13px+ text fits on mobile and the list reads in pipeline order.
export function AnalystRows({ agents, from = 0, to = AGENTS.length, className = "border-t border-rule", stacked = false }: AnalystRowsProps) {
  return (
    <ul className={className}>
      {AGENTS.slice(from, to).map((cfg, i) => {
        const status = agents[from + i]?.status ?? "waiting";
        return (
          <li
            key={cfg.name}
            className={`grid grid-cols-[20px_1fr] ${stacked ? "" : "sm:grid-cols-[20px_12rem_1fr_auto]"} gap-x-3 gap-y-0.5 items-center py-4 border-b border-rule ${status === "waiting" ? "text-graphite" : ""}`}
          >
            <StatusIcon status={status} />
            <span className="font-semibold">{cfg.name}</span>
            <span className={`col-start-2 ${stacked ? "" : "sm:col-start-auto"} text-graphite`}>{cfg.short}</span>
            <span className={`col-start-2 ${stacked ? "" : "sm:col-start-auto"} text-13 text-graphite`}>{LABEL[status]}</span>
          </li>
        );
      })}
    </ul>
  );
}
