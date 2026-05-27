"use client";

import { CheckCircle2, Loader2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { AgentInfo } from "@/lib/useAnalysis";

interface AgentTimelineProps {
  agents: AgentInfo[];
}

const AGENT_ROLES: Record<string, string> = {
  "Document Analyst": "Story · Genre · Rights",
  "Talent Researcher": "Director · Cast value",
  "Market Analyst": "Streaming · Comps",
  "Deals Researcher": "Pricing · Anchors",
  "Buzz Analyst": "Reviews · Sentiment",
  "Risk Analyst": "Flags · Register",
  "Acquisitions Strategist": "Synthesis · Bid range",
};

export function AgentTimeline({ agents }: AgentTimelineProps) {
  const specialists = agents.slice(0, 6);
  const strategist = agents[6];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {specialists.map((agent) => (
          <AgentCard key={agent.name} agent={agent} />
        ))}
      </div>
      {strategist && <AgentCard agent={strategist} fullWidth />}
    </div>
  );
}

function AgentCard({ agent, fullWidth = false }: { agent: AgentInfo; fullWidth?: boolean }) {
  const isRunning = agent.status === "running";
  const isDone = agent.status === "done";
  const role = AGENT_ROLES[agent.name] ?? "";

  return (
    <div
      className={`rounded-lg p-3 transition-all ${
        isRunning ? "agent-card-running" : isDone ? "agent-card-done" : "agent-card-waiting"
      } ${fullWidth ? "flex items-center gap-3" : "flex flex-col gap-2"}`}
    >
      <div className={`flex items-center justify-between gap-2 ${fullWidth ? "flex-1" : ""}`}>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {agent.name}
          </p>
          {role && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--color-text-dim)" }}>
              {role}
            </p>
          )}
        </div>
        <StatusIcon status={agent.status} />
      </div>

      {isRunning && (
        <div className={`flex flex-col gap-1.5 ${fullWidth ? "flex-row flex-1" : ""}`}>
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-1.5 w-3/4" />
          {!fullWidth && <Skeleton className="h-1.5 w-1/2" />}
        </div>
      )}

      {isDone && !fullWidth && (
        <Badge variant="success" className="self-start text-[10px] py-0 px-1.5">
          Complete
        </Badge>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: AgentInfo["status"] }) {
  if (status === "done") return <CheckCircle2 size={13} className="shrink-0 text-green-400" />;
  if (status === "running") return <Loader2 size={13} className="shrink-0 text-blue-400 animate-spin" />;
  return <Clock size={13} className="shrink-0" style={{ color: "var(--color-text-dim)" }} />;
}
