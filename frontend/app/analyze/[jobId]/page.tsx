"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { AgentTimeline } from "@/components/AgentTimeline";
import { ReportDisplay } from "@/components/ReportDisplay";
import { SPECIALIST_NAMES } from "@/lib/agents";
import { useAnalysis } from "@/lib/useAnalysis";
import Link from "next/link";
import { AlertCircle, Loader2, CheckCircle2, ChevronDown, Download, Plus } from "lucide-react";

function AnalysisContent() {
  const params = useParams<{ jobId: string }>();
  const searchParams = useSearchParams();
  const filenames = (searchParams.get("filenames") ?? "film.pdf").split(",");
  const filename = filenames[0];

  const state = useAnalysis(params.jobId, filename);
  const doneCount = state.agents.filter((a) => a.status === "done").length;
  const progress = Math.round((state.currentStep / state.totalSteps) * 100);
  const isActive = state.phase === "ingest" || state.phase === "crew";
  const isDone = state.phase === "complete";
  const isError = state.phase === "error";

  return (
    <div className="min-h-[100dvh] pt-14" style={{ background: "var(--color-bg)" }}>
      <NavBar />

      {/* ── CINEMATIC HEADER ── */}
      <div
        className="print:hidden"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background:
            "linear-gradient(180deg, rgb(var(--accent-rgb) / 0.035) 0%, transparent 100%)",
        }}
      >
        {/* Film-strip perforation top */}
        <div
          className="film-strip h-[2px] w-full"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent 0, transparent 11px, rgb(var(--accent-rgb) / 0.22) 11px, rgb(var(--accent-rgb) / 0.22) 15px)",
          }}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring" as const, stiffness: 90, damping: 22 }}
            className="flex flex-col sm:flex-row items-start sm:justify-between gap-4 sm:gap-6"
          >
            {/* Title block */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[11px] font-sans font-semibold uppercase tracking-[0.26em] mb-3"
                style={{ color: "var(--color-gold)", opacity: 0.85 }}
              >
                Acquisition Analysis
              </p>
              <h1
                className="font-display leading-[1.06] tracking-tight"
                style={{
                  fontSize: "clamp(1.9rem,4vw,3rem)",
                  color: "var(--color-text)",
                }}
              >
                {state.filmTitle}
              </h1>
              {filenames.length > 1 && (
                <p
                  className="text-[11px] font-sans mt-2"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  {filenames.length} documents —{" "}
                  {filenames.slice(0, 3).join(", ")}
                  {filenames.length > 3 ? ` +${filenames.length - 3} more` : ""}
                </p>
              )}
            </div>

            {/* Phase badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring" as const,
                stiffness: 160,
                damping: 20,
                delay: 0.12,
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-sans font-semibold shrink-0 mt-1"
              style={{
                background: isDone
                  ? "rgb(var(--success-rgb) / 0.08)"
                  : isError
                  ? "rgb(var(--danger-rgb) / 0.08)"
                  : "rgb(var(--accent-rgb) / 0.08)",
                border: isDone
                  ? "1px solid rgb(var(--success-rgb) / 0.35)"
                  : isError
                  ? "1px solid rgb(var(--danger-rgb) / 0.35)"
                  : "1px solid rgb(var(--accent-rgb) / 0.35)",
                color: isDone
                  ? "var(--color-success)"
                  : isError
                  ? "var(--color-error)"
                  : "var(--color-gold)",
              }}
            >
              {isDone ? (
                <CheckCircle2 size={13} />
              ) : isError ? (
                <AlertCircle size={13} />
              ) : (
                <Loader2 size={13} className="animate-spin" />
              )}
              {isDone
                ? "Analysis Complete"
                : isError
                ? "Analysis Failed"
                : state.phase === "ingest"
                ? "Ingesting…"
                : "Analyzing…"}
            </motion.div>
          </motion.div>

          {/* Progress strip — shown only while active */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring" as const, stiffness: 100, damping: 22 }}
                className="mt-8"
              >
                <div className="flex justify-between items-center mb-2">
                  <p
                    className="text-[11px] font-sans"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {state.phase === "crew"
                      ? `${doneCount} of ${SPECIALIST_NAMES.length} specialists complete`
                      : state.message}
                  </p>
                  <p
                    className="text-[11px] font-sans font-semibold tabular-nums"
                    style={{ color: "var(--color-gold)" }}
                  >
                    {progress}%
                  </p>
                </div>
                <div className="progress-track h-0.5">
                  <div
                    className="progress-fill h-full"
                    style={{ width: `${Math.max(progress, 3)}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">

        {/* ── Ingesting state ── atmospheric card */}
        <AnimatePresence>
          {state.phase === "ingest" && (
            <motion.div
              key="ingest"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ type: "spring" as const, stiffness: 85, damping: 22 }}
              className="rounded-2xl p-8 sm:p-14 flex flex-col items-center gap-7 text-center mb-8 relative overflow-hidden"
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Top glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[360px] h-[180px] pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse, rgb(var(--accent-rgb) / 0.09) 0%, transparent 68%)",
                }}
              />

              {/* Spinner ring */}
              <div
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgb(var(--accent-rgb) / 0.07)",
                  border: "1px solid rgb(var(--accent-rgb) / 0.22)",
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 size={24} className="text-gold" />
                </motion.div>
              </div>

              <div className="relative">
                <p
                  className="font-display text-2xl mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {state.message}
                </p>
                <p
                  className="text-[13px] font-sans leading-relaxed"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {filenames.length > 1
                    ? `Parsing, chunking, and indexing ${filenames.length} documents into vector memory`
                    : "Parsing, chunking, embedding, and indexing your document"}
                </p>
              </div>

              <div className="relative w-64 h-0.5 shimmer-bar rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Agent timeline ── */}
        <AnimatePresence>
          {state.phase === "crew" && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring" as const, stiffness: 85, damping: 22 }}
              className="mb-12"
            >
              <p
                className="text-[11px] font-sans font-semibold uppercase tracking-[0.2em] mb-5"
                style={{ color: "var(--color-text-dim)" }}
              >
                Specialist Team
              </p>
              <AgentTimeline agents={state.agents} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Once done the team is a footnote: collapse it so the bid range sits above the fold. */}
        {isDone && (
          <details className="group print:hidden mb-6">
            <summary
              className="inline-flex items-center gap-2 min-h-[44px] cursor-pointer list-none text-[13px] font-sans font-medium [&::-webkit-details-marker]:hidden"
              style={{ color: "var(--color-text-muted)" }}
            >
              <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} aria-hidden />
              All {state.agents.length} specialists complete
              <ChevronDown
                size={14}
                className="transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-4">
              <AgentTimeline agents={state.agents} />
            </div>
          </details>
        )}

        {/* ── Error state ── */}
        <AnimatePresence>
          {isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring" as const, stiffness: 100, damping: 22 }}
              className="rounded-2xl p-8 sm:p-12 flex flex-col items-center gap-6 text-center"
              style={{
                background: "rgb(var(--danger-rgb) / 0.04)",
                border: "1px solid rgb(var(--danger-rgb) / 0.2)",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgb(var(--danger-rgb) / 0.09)",
                  border: "1px solid rgb(var(--danger-rgb) / 0.22)",
                }}
              >
                <AlertCircle size={24} style={{ color: "var(--color-error)" }} />
              </div>
              <div>
                <p
                  className="font-display text-2xl mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  Analysis failed
                </p>
                <p
                  className="text-[13px] font-sans max-w-sm leading-relaxed"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {state.error}
                </p>
              </div>
              <a href="/" className="btn-ghost px-5 py-2 rounded-lg text-sm font-sans mt-1">
                Try another file
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Report actions ── */}
        {isDone && state.report && (
          <div className="print:hidden mb-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-gold px-5 py-3 sm:py-2.5 rounded-lg text-sm font-sans font-semibold flex items-center justify-center gap-2"
            >
              <Download size={16} /> Download PDF
            </button>
            <Link
              href="/"
              className="btn-ghost px-5 py-3 sm:py-2.5 rounded-lg text-sm font-sans flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Analyze another film
            </Link>
          </div>
        )}

        {/* ── Report — dramatic reveal ── */}
        <AnimatePresence>
          {isDone && state.report && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring" as const,
                stiffness: 65,
                damping: 22,
                delay: 0.08,
              }}
            >
              <ReportDisplay
                report={state.report}
                filmTitle={state.filmTitle}
                bidRange={state.bidRange}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
          <Loader2 size={24} className="text-gold animate-spin" />
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}
