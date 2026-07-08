"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { NavBar } from "@/components/NavBar";
import { AgentTimeline } from "@/components/AgentTimeline";
import { ReportDisplay } from "@/components/ReportDisplay";
import { useAnalysis, SPECIALIST_NAMES } from "@/lib/useAnalysis";

function AnalysisContent() {
  const params = useParams<{ jobId: string }>();
  const searchParams = useSearchParams();
  const filenamesRaw =
    searchParams.get("filenames") ?? searchParams.get("filename") ?? "film.pdf";
  const filenames = filenamesRaw.split(",");
  const filename = filenames[0];

  const state = useAnalysis(params.jobId, filename);
  const doneCount = state.agents.filter((a) => a.status === "done").length;
  const totalAgents = SPECIALIST_NAMES.length + 1;
  const progressPct = Math.round((state.currentStep / state.totalSteps) * 100);
  const isActive = state.phase === "ingest" || state.phase === "crew";
  const isDone = state.phase === "complete";
  const isError = state.phase === "error";

  if (isDone) {
    return (
      <div style={{ background: "#f7f3ec", minHeight: "100dvh" }}>
        <NavBar sectionLabel={`REPORT / ${state.filmTitle.toUpperCase()}`}>
          <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#2f7d52" }}>
            <span className="rounded-full" style={{ width: 7, height: 7, background: "#2f7d52" }} />
            ANALYSIS COMPLETE
          </span>
          <button className="btn-dark" onClick={() => window.print()}>
            Export memo ⤓
          </button>
        </NavBar>

        <div className="animate-fq-up" style={{ padding: "36px 32px 24px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", color: "#c94f32", marginBottom: 10 }}>
            ACQUISITION REPORT
          </div>
          <h1 className="font-display" style={{ fontSize: "clamp(2rem,4vw,3.5rem)", lineHeight: 1, color: "#1a160f" }}>
            {state.filmTitle}
          </h1>
        </div>

        <ReportDisplay
          report={state.report ?? ""}
          filmTitle={state.filmTitle}
          bidRange={state.bidRange}
          genre={state.genre}
          director={state.director}
          dealScore={state.dealScore}
          verdict={state.verdict}
          thesis={state.thesis}
          bidRationale={state.bidRationale}
          strengths={state.strengths}
          concerns={state.concerns}
          risks={state.risks}
          comparables={state.comparables}
          specialistFindings={state.specialistFindings}
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ background: "#f7f3ec", minHeight: "100dvh" }}>
        <NavBar sectionLabel="ANALYZING" />
        <div className="flex flex-col items-center gap-5 text-center" style={{ padding: "80px 32px" }}>
          <p className="font-display" style={{ fontSize: 28, color: "#1a160f" }}>Analysis failed</p>
          <p style={{ fontSize: 14, color: "#5c564a", maxWidth: 420 }}>{state.error}</p>
          <a href="/" className="btn-tertiary">Try another file</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#f7f3ec", minHeight: "100dvh" }}>
      <NavBar sectionLabel="ANALYZING">
        <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#c94f32" }}>
          <span className="rounded-full animate-fq-dot" style={{ width: 7, height: 7, background: "#c94f32" }} />
          LIVE
        </span>
      </NavBar>

      <div className="mx-auto" style={{ maxWidth: 860 }}>
        <div className="animate-fq-up" style={{ padding: "32px 32px 20px" }}>
          <div className="flex items-end gap-5">
            <div className="flex-1">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", color: "#c94f32", marginBottom: 8 }}>
                {state.phase === "ingest" ? "PROCESSING DOCUMENTS" : "ACQUISITION ANALYSIS IN PROGRESS"}
              </div>
              <h1 className="font-display" style={{ fontSize: 42, lineHeight: 1, color: "#1a160f" }}>
                {state.filmTitle || "Analyzing…"}
              </h1>
            </div>
            {isActive && state.phase === "crew" && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 600, color: "#1a160f" }}>
                  {progressPct}%
                </div>
                <div className="mono-label">{doneCount} OF {totalAgents} AGENTS DONE</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 18, height: 4, borderRadius: 99, background: "rgba(26,22,15,.08)", overflow: "hidden" }}>
            <div
              className="animate-fq-shimmer"
              style={{
                width: `${Math.max(progressPct, 4)}%`,
                height: "100%",
                borderRadius: 99,
                background: "linear-gradient(90deg,#c94f32,#e08662)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        </div>

        {state.phase === "ingest" && (
          <div className="mx-8 mb-8" style={{ fontSize: 13, color: "#5c564a" }}>{state.message}</div>
        )}

        {state.phase === "crew" && (
          <div style={{ padding: "8px 32px 32px" }}>
            <AgentTimeline agents={state.agents} crewStartedAt={state.crewStartedAt} now={state.now} />
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
        <div className="flex items-center justify-center" style={{ minHeight: "100dvh", background: "#f7f3ec" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#837b6c" }}>Loading…</span>
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}
