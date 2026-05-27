"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AgentTimeline } from "@/components/AgentTimeline";
import { ScenarioPanel } from "@/components/ScenarioPanel";
import { BidRangeHero } from "@/components/dashboard/BidRangeHero";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { RiskRegister } from "@/components/dashboard/RiskRegister";
import { ComparableDealsTable } from "@/components/dashboard/ComparableDealsTable";
import { FestivalBuzzChart } from "@/components/dashboard/FestivalBuzzChart";
import { useAnalysis } from "@/lib/useAnalysis";
import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";

function AnalysisContent() {
  const params = useParams<{ jobId: string }>();
  const searchParams = useSearchParams();
  const filenamesRaw =
    searchParams.get("filenames") ?? searchParams.get("filename") ?? "film.pdf";
  const filenames = filenamesRaw.split(",");

  const state = useAnalysis(params.jobId, filenames[0]);
  const doneCount = state.agents.filter((a) => a.status === "done").length;
  const progress = Math.round((state.currentStep / state.totalSteps) * 100);
  const isActive = state.phase === "ingest" || state.phase === "crew";
  const isDone = state.phase === "complete";
  const isError = state.phase === "error";

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between gap-4"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
            style={{ color: "var(--color-text-dim)" }}
          >
            Acquisition Analysis
          </p>
          <h1
            className="text-base font-semibold truncate"
            style={{ color: "var(--color-text)" }}
          >
            {state.filmTitle}
          </h1>
        </div>

        {isDone && (
          <ScenarioPanel report={state.report} filmTitle={state.filmTitle} />
        )}

        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold shrink-0"
          style={{
            background: isDone
              ? "rgba(34,197,94,0.08)"
              : isError
              ? "rgba(239,68,68,0.08)"
              : "var(--color-accent-dim)",
            border: isDone
              ? "1px solid rgba(34,197,94,0.3)"
              : isError
              ? "1px solid rgba(239,68,68,0.3)"
              : "1px solid var(--color-accent-border)",
            color: isDone
              ? "var(--color-success)"
              : isError
              ? "var(--color-error)"
              : "var(--color-accent)",
          }}
        >
          {isDone ? (
            <CheckCircle2 size={12} />
          ) : isError ? (
            <AlertCircle size={12} />
          ) : (
            <Loader2 size={12} className="animate-spin" />
          )}
          {isDone
            ? "Complete"
            : isError
            ? "Failed"
            : state.phase === "ingest"
            ? "Ingesting…"
            : "Analyzing…"}
        </div>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="h-0.5 w-full" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${Math.max(progress, 3)}%`,
              background: "var(--color-accent)",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="max-w-[1280px] mx-auto px-6 py-6">

        {/* Ingest state */}
        {state.phase === "ingest" && (
          <div
            className="rounded-lg p-12 flex flex-col items-center gap-5 text-center mb-6"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border-strong)",
            }}
          >
            <Loader2
              size={28}
              className="animate-spin"
              style={{ color: "var(--color-accent)" }}
            />
            <div>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "var(--color-text)" }}
              >
                {state.message}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                {filenames.length > 1
                  ? `Parsing and indexing ${filenames.length} documents`
                  : "Parsing, chunking, and indexing your document"}
              </p>
            </div>
          </div>
        )}

        {/* Agent timeline — crew phase + complete */}
        {(state.phase === "crew" || isDone) && (
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-4"
              style={{ color: "var(--color-text-dim)" }}
            >
              Specialist Team &middot;{" "}
              {isDone
                ? "All complete"
                : `${doneCount} / ${state.totalSteps} complete`}
            </p>
            <AgentTimeline agents={state.agents} />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div
            className="rounded-lg p-10 flex flex-col items-center gap-5 text-center"
            style={{
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <AlertCircle size={28} style={{ color: "var(--color-error)" }} />
            <div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--color-text)" }}
              >
                Analysis failed
              </p>
              <p
                className="text-xs max-w-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                {state.error}
              </p>
            </div>
            <a
              href="/"
              className="text-xs font-medium px-4 py-2 rounded"
              style={{
                background: "var(--color-surface-raised)",
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              Try another file
            </a>
          </div>
        )}

        {/* Bento report — structured JSON */}
        {isDone && state.report && (
          <div className="flex flex-col gap-4 fade-in">
            <BidRangeHero
              bidRange={state.report.bidRange}
              filmTitle={state.filmTitle}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                <ExecutiveSummary summary={state.report.executiveSummary} />
                <RiskRegister risks={state.report.riskFlags} />
              </div>
              <div className="flex flex-col gap-4">
                <ComparableDealsTable deals={state.report.comparableDeals} />
                <FestivalBuzzChart buzz={state.report.festivalBuzz} />
              </div>
            </div>
          </div>
        )}

        {/* Fallback — raw text when JSON parse failed */}
        {isDone && !state.report && state.reportRaw && (
          <div
            className="rounded-lg p-5 fade-in"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border-strong)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <FileText size={13} style={{ color: "var(--color-text-dim)" }} />
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text-dim)" }}
              >
                Analysis Report
              </p>
            </div>
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
              style={{ color: "var(--color-text-muted)" }}
            >
              {state.reportRaw}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-[100dvh] flex items-center justify-center"
          style={{ background: "var(--color-bg)" }}
        >
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "var(--color-accent)" }}
          />
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}
