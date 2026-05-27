"use client";

import { useEffect, useState } from "react";
import { getAnalysisUrl } from "./api";
import type { AcquisitionReport } from "./types";

export type AgentStatus = "waiting" | "running" | "done";
export type Phase = "idle" | "ingest" | "crew" | "complete" | "error";

export interface AgentInfo {
  name: string;
  status: AgentStatus;
}

export interface AnalysisState {
  phase: Phase;
  message: string;
  filmTitle: string;
  agents: AgentInfo[];
  currentStep: number;
  totalSteps: number;
  report: AcquisitionReport | null;
  reportRaw: string | null;
  error: string | null;
}

const SPECIALIST_NAMES = [
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

function setAgentStatus(agents: AgentInfo[], name: string, status: AgentStatus): AgentInfo[] {
  return agents.map((a) => (a.name === name ? { ...a, status } : a));
}

export function useAnalysis(jobId: string, filenameHint: string): AnalysisState {
  const [state, setState] = useState<AnalysisState>({
    phase: "idle",
    message: "Starting analysis…",
    filmTitle: filenameHint.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
    agents: initAgents("waiting"),
    currentStep: 0,
    totalSteps: ALL_AGENT_NAMES.length,
    report: null,
    reportRaw: null,
    error: null,
  });

  useEffect(() => {
    if (!jobId) return;
    const source = new EventSource(getAnalysisUrl(jobId));

    source.onmessage = (ev) => {
      const data = JSON.parse(ev.data as string) as Record<string, unknown>;

      setState((prev) => {
        switch (data.type) {
          case "status":
            return {
              ...prev,
              phase:
                data.phase === "ingest" || data.phase === "ingest_done"
                  ? "ingest"
                  : prev.phase,
              message: (data.message as string) ?? prev.message,
              filmTitle: (data.film_title as string) ?? prev.filmTitle,
            };

          case "crew_start": {
            const agents = ALL_AGENT_NAMES.map((name) => ({
              name,
              status: (SPECIALIST_NAMES.includes(name) ? "running" : "waiting") as AgentStatus,
            }));
            return {
              ...prev,
              phase: "crew",
              filmTitle: (data.film_title as string) ?? prev.filmTitle,
              message: (data.message as string) ?? prev.message,
              agents,
              currentStep: 0,
            };
          }

          case "agent_done": {
            const agentName = data.agent as string;
            const agents = setAgentStatus(prev.agents, agentName, "done");
            const doneCount = agents.filter((a) => a.status === "done").length;
            return { ...prev, agents, currentStep: doneCount };
          }

          case "strategist_start": {
            const agents = setAgentStatus(prev.agents, STRATEGIST_NAME, "running");
            return {
              ...prev,
              agents,
              message: (data.message as string) ?? "Synthesizing all findings…",
            };
          }

          case "complete": {
            const reportJson = data.report_json as AcquisitionReport | null;
            const reportRaw = (data.report as string) ?? null;
            const filmTitle =
              reportJson?.filmTitle ??
              (data.film_title as string) ??
              prev.filmTitle;

            return {
              ...prev,
              phase: "complete",
              report: reportJson,
              reportRaw,
              filmTitle,
              agents: initAgents("done"),
              currentStep: ALL_AGENT_NAMES.length,
              message: "Analysis complete.",
            };
          }

          case "error":
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
    };

    return () => source.close();
  }, [jobId]);

  return state;
}
