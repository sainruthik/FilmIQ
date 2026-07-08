"use client";

import { useEffect, useRef, useState } from "react";
import { getAnalysisUrl } from "./api";
import type { ComparableDeal, RiskItem, Source } from "./trade";

export type AgentStatus = "waiting" | "running" | "done";
export type Phase = "idle" | "ingest" | "crew" | "complete" | "error";

export interface AgentInfo {
  name: string;
  status: AgentStatus;
  finding?: string;
  sources?: Source[];
  elapsed?: string; // server-provided "m:ss" once done
}

export interface BidRange {
  low: string | null;
  fair: string | null;
  walk_away: string | null;
}

export interface AnalysisState {
  phase: Phase;
  message: string;
  filmTitle: string;
  agents: AgentInfo[];
  currentStep: number;
  totalSteps: number;
  crewStartedAt: number | null;
  now: number;

  report: string | null;
  bidRange: BidRange | null;
  genre: string | null;
  director: string | null;
  dealScore: number | null;
  verdict: string | null;
  thesis: string | null;
  bidRationale: string | null;
  strengths: string[];
  concerns: string[];
  risks: RiskItem[];
  comparables: ComparableDeal[];
  specialistFindings: Record<string, string>;

  error: string | null;
}

export const SPECIALIST_NAMES = [
  "Document Analyst",
  "Talent Researcher",
  "Market Analyst",
  "Deals Researcher",
  "Buzz Analyst",
  "Risk Analyst",
];

const STRATEGIST_NAME = "Acquisitions Strategist";
const ALL_AGENT_NAMES = [...SPECIALIST_NAMES, STRATEGIST_NAME];

function initAgents(status: AgentStatus = "waiting"): AgentInfo[] {
  return ALL_AGENT_NAMES.map((name) => ({ name, status }));
}

function updateAgent(agents: AgentInfo[], name: string, patch: Partial<AgentInfo>): AgentInfo[] {
  return agents.map((a) => (a.name === name ? { ...a, ...patch } : a));
}

const initialState: AnalysisState = {
  phase: "idle",
  message: "Starting analysis…",
  filmTitle: "",
  agents: initAgents("waiting"),
  currentStep: 0,
  totalSteps: ALL_AGENT_NAMES.length,
  crewStartedAt: null,
  now: Date.now(),
  report: null,
  bidRange: null,
  genre: null,
  director: null,
  dealScore: null,
  verdict: null,
  thesis: null,
  bidRationale: null,
  strengths: [],
  concerns: [],
  risks: [],
  comparables: [],
  specialistFindings: {},
  error: null,
};

export function useAnalysis(jobId: string, filenameHint: string): AnalysisState {
  const [state, setState] = useState<AnalysisState>({
    ...initialState,
    filmTitle: filenameHint.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
  });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const source = new EventSource(getAnalysisUrl(jobId));

    source.onmessage = (ev) => {
      const data = JSON.parse(ev.data as string) as Record<string, unknown>;

      // Close explicitly once the stream is logically finished so EventSource
      // never auto-reconnects (which would hit the rate limit for nothing).
      if (data.type === "complete" || data.type === "error" || data.type === "stream_end") {
        source.close();
        if (tickRef.current) clearInterval(tickRef.current);
      }

      setState((prev) => {
        switch (data.type) {
          case "status":
            return {
              ...prev,
              phase: (data.phase === "ingest" || data.phase === "ingest_done") ? "ingest" : prev.phase,
              message: (data.message as string) ?? prev.message,
              filmTitle: (data.film_title as string) ?? prev.filmTitle,
            };

          case "crew_start": {
            // All specialists fire simultaneously
            const agents = ALL_AGENT_NAMES.map((name) => ({
              name,
              status: (SPECIALIST_NAMES.includes(name) ? "running" : "waiting") as AgentStatus,
            }));
            if (!tickRef.current) {
              tickRef.current = setInterval(() => {
                setState((s) => ({ ...s, now: Date.now() }));
              }, 1000);
            }
            return {
              ...prev,
              phase: "crew",
              filmTitle: (data.film_title as string) ?? prev.filmTitle,
              message: (data.message as string) ?? prev.message,
              agents,
              currentStep: 0,
              crewStartedAt: Date.now(),
            };
          }

          case "agent_done": {
            const agentName = data.agent as string;
            const agents = updateAgent(prev.agents, agentName, {
              status: "done",
              finding: data.finding as string | undefined,
              sources: (data.sources as Source[] | undefined) ?? [],
              elapsed: data.elapsed as string | undefined,
            });
            const doneCount = agents.filter((a) => a.status === "done").length;
            return { ...prev, agents, currentStep: doneCount };
          }

          case "strategist_start": {
            const agents = updateAgent(prev.agents, STRATEGIST_NAME, { status: "running" });
            return {
              ...prev,
              agents,
              message: (data.message as string) ?? "Synthesizing all findings…",
            };
          }

          case "complete": {
            const rawBid = data.bid_range as Record<string, string> | undefined;
            const bidRange: BidRange | null = rawBid
              ? { low: rawBid.low ?? null, fair: rawBid.fair ?? null, walk_away: rawBid.walk_away ?? null }
              : null;
            if (tickRef.current) clearInterval(tickRef.current);
            return {
              ...prev,
              phase: "complete",
              report: (data.report as string) ?? null,
              bidRange,
              genre: (data.genre as string) ?? null,
              director: (data.director as string) ?? null,
              dealScore: (data.deal_score as number) ?? null,
              verdict: (data.verdict as string) ?? null,
              thesis: (data.thesis as string) ?? null,
              bidRationale: (data.bid_rationale as string) ?? null,
              strengths: (data.strengths as string[]) ?? [],
              concerns: (data.concerns as string[]) ?? [],
              risks: (data.risks as RiskItem[]) ?? [],
              comparables: (data.comparables as ComparableDeal[]) ?? [],
              specialistFindings: (data.specialist_findings as Record<string, string>) ?? {},
              filmTitle: (data.film_title as string) ?? prev.filmTitle,
              agents: initAgents("done"),
              currentStep: ALL_AGENT_NAMES.length,
              message: "Analysis complete.",
            };
          }

          case "error":
            if (tickRef.current) clearInterval(tickRef.current);
            return {
              ...prev,
              phase: "error",
              error: (data.message as string) ?? "An unknown error occurred.",
            };

          default:
            return prev;
        }
      });
    };

    source.onerror = () => {
      setState((prev) => {
        if (prev.phase === "complete") return prev;
        return { ...prev, phase: "error", error: "Connection to analysis server was lost." };
      });
      source.close();
      if (tickRef.current) clearInterval(tickRef.current);
    };

    return () => {
      source.close();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [jobId]);

  return state;
}
