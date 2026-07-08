"use client";

import type { AgentInfo } from "@/lib/useAnalysis";
import { CitationChip } from "@/components/trade/CitationChip";

function elapsedLabel(startedAt: number | null, now: number): string {
  if (!startedAt) return "0:00";
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

interface Props {
  agents: AgentInfo[];
  crewStartedAt: number | null;
  now: number;
}

export function AgentTimeline({ agents, crewStartedAt, now }: Props) {
  const done = agents.filter((a) => a.status === "done");
  const running = agents.filter((a) => a.status === "running");
  const waiting = agents.filter((a) => a.status === "waiting");

  return (
    <div className="flex flex-col">
      {done.map((agent) => (
        <div key={agent.name} className="flex gap-4 animate-fq-up">
          <div className="flex flex-col items-center" style={{ width: 26, flexShrink: 0 }}>
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 22, height: 22, background: "rgba(47,125,82,.12)", border: "1.5px solid #2f7d52", color: "#2f7d52", fontSize: 11 }}
            >
              ✓
            </span>
            <span style={{ flex: 1, width: 1.5, background: "rgba(26,22,15,.15)", margin: "4px 0" }} />
          </div>
          <div className="flex-1" style={{ paddingBottom: 18 }}>
            <div className="flex items-baseline gap-2.5">
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1a160f" }}>{agent.name}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "#2f7d52" }}>
                DONE · {agent.elapsed ?? "0:00"}
              </span>
            </div>
            {agent.finding && (
              <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6, color: "#5c564a" }}>{agent.finding}</div>
            )}
            {agent.sources && agent.sources.length > 0 && (
              <div className="flex gap-1.5" style={{ marginTop: 8, flexWrap: "wrap" }}>
                {agent.sources.map((s, i) => (
                  <CitationChip key={i} source={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {running.map((agent) => (
        <div key={agent.name} className="flex gap-4 animate-fq-up">
          <div className="flex flex-col items-center" style={{ width: 26, flexShrink: 0 }}>
            <span
              className="flex items-center justify-center rounded-full animate-fq-dot"
              style={{ width: 22, height: 22, background: "#c94f32", color: "#fffdf9", fontSize: 10 }}
            >
              ●
            </span>
            <span style={{ flex: 1, width: 1.5, background: "rgba(26,22,15,.15)", margin: "4px 0" }} />
          </div>
          <div className="flex-1" style={{ paddingBottom: 18 }}>
            <div
              className="trade-card"
              style={{ border: "1px solid #c94f32", boxShadow: "0 6px 20px rgba(201,79,50,.1)", padding: "16px 20px" }}
            >
              <div className="flex items-baseline gap-2.5">
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1a160f" }}>{agent.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "#c94f32" }}>
                  WORKING · {elapsedLabel(crewStartedAt, now)}
                </span>
              </div>
              <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.7, color: "#3a352b" }}>
                Researching…
                <span
                  className="inline-block animate-fq-blink"
                  style={{ width: 8, height: 14, background: "#c94f32", verticalAlign: -2, marginLeft: 2 }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {waiting.map((agent) => (
        <div key={agent.name} className="flex gap-4">
          <div className="flex flex-col items-center" style={{ width: 26, flexShrink: 0 }}>
            <span className="rounded-full" style={{ width: 22, height: 22, border: "1.5px dashed rgba(26,22,15,.3)" }} />
            <span style={{ flex: 1, width: 1.5, background: "rgba(26,22,15,.08)", margin: "4px 0" }} />
          </div>
          <div className="flex-1" style={{ padding: "2px 0 18px" }}>
            <span style={{ fontSize: 14, color: "#b3aa99" }}>{agent.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "#b3aa99", marginLeft: 10 }}>
              QUEUED
            </span>
          </div>
        </div>
      ))}

      <div style={{ marginLeft: 42, fontFamily: "var(--font-mono)", fontSize: 10, color: "#837b6c" }}>
        → Report assembles automatically when the Strategist completes
      </div>
    </div>
  );
}
