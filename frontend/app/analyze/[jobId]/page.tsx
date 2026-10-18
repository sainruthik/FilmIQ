"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { AnalystRows } from "@/components/AnalystRows";
import { BidScale } from "@/components/BidScale";
import { BidBar } from "@/components/BidBar";
import { Haze } from "@/components/Haze";
import { VerdictReveal } from "@/components/VerdictReveal";
import { ReportDisplay } from "@/components/ReportDisplay";
import { SPECIALIST_NAMES } from "@/lib/agents";
import { useAnalysis, type AnalysisState, type BidRange } from "@/lib/useAnalysis";

const SPECIALISTS = SPECIALIST_NAMES.length;

function statusLine(state: AnalysisState, doneCount: number): string {
  if (state.phase === "crew") {
    const strategistRunning = state.agents[SPECIALISTS]?.status === "running";
    return strategistRunning ? "All six finished. Writing the bid" : `${doneCount} of ${SPECIALISTS} analysts finished`;
  }
  return state.message;
}

function Progress({ state }: { state: AnalysisState }) {
  const doneCount = state.agents.filter((a) => a.status === "done").length;
  const progress = Math.max(3, Math.round((state.currentStep / state.totalSteps) * 100));
  return (
    <div className="mt-8">
      <div className="flex justify-between gap-4 text-13">
        <span aria-live="polite">{statusLine(state, doneCount)}</span>
        <b className="font-semibold tabular-nums">{progress}%</b>
      </div>
      <div className="h-[2px] mt-2 bg-rule overflow-hidden">
        <div
          className="h-full bg-ink origin-left transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
    </div>
  );
}

function Running({ state }: { state: AnalysisState }) {
  return (
    <section aria-label="Analysis progress" className="grid gap-12 pt-12 pb-28 lg:grid-cols-[2fr_1fr] lg:gap-18">
      <div>
        <h2 className="text-20 font-semibold tracking-[-0.01em] mb-4">
          {state.phase === "crew" ? "Working now, all six at once" : "Up next, all six at once"}
        </h2>
        <AnalystRows agents={state.agents} to={SPECIALISTS} />
      </div>
      <aside className="border-l-2 border-rule pl-6 self-start">
        <h2 className="text-20 font-semibold tracking-[-0.01em]">Then</h2>
        <AnalystRows agents={state.agents} from={SPECIALISTS} className="[&>li]:border-b-0" stacked />
        <p className="text-graphite mt-2">
          The acquisitions strategist starts when all six finish, weighs their findings, and writes the bid.
        </p>
      </aside>
    </section>
  );
}

function confidenceLine(bid: BidRange): string | null {
  if (!bid.confidence) return null;
  const n = bid.priced_comparables ?? 0;
  return `${bid.confidence} confidence: based on ${n} comparable ${n === 1 ? "deal" : "deals"} with a disclosed price.`;
}

function Verdict({ state }: { state: AnalysisState }) {
  const bid = state.bidRange;
  const hasBid = !!bid && !!(bid.low || bid.fair || bid.walk_away);
  return (
    <section id="verdict" className="pt-12 pb-8 border-b border-rule">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
        <h2 className="text-20 font-semibold tracking-[-0.01em]">{hasBid ? "Bid range" : "Report ready"}</h2>
        <div className="print:hidden flex flex-wrap gap-3">
          <button type="button" onClick={() => window.print()} className="btn">
            Download PDF
          </button>
          <Link href="/" className="btn btn-ghost">
            Analyze another film
          </Link>
        </div>
      </div>
      {hasBid && bid && (
        <>
          {/* Starts while the header fog is still clearing. */}
          <VerdictReveal delay={0.5}>
            <BidScale low={bid.low} fair={bid.fair} walkAway={bid.walk_away} />
          </VerdictReveal>
          {confidenceLine(bid) && <p className="mt-8 text-13 text-graphite">{confidenceLine(bid)}</p>}
        </>
      )}
      <details className="print:hidden mt-6">
        <summary className="inline-flex items-center min-h-[44px] cursor-pointer text-13 text-graphite hover:text-ink">
          All {state.agents.length} analysts finished
        </summary>
        <AnalystRows agents={state.agents} />
      </details>
    </section>
  );
}

function Failed({ message }: { message: string | null }) {
  return (
    <section className="pt-12 pb-28">
      <div role="alert" className="border-l-2 border-cherry pl-6 max-w-[60ch]">
        <h2 className="text-25 font-semibold mb-2">Analysis stopped</h2>
        <p className="text-graphite mb-6">{message ?? "The analysis ended without a result."}</p>
        <Link href="/" className="btn">
          Upload again
        </Link>
      </div>
    </section>
  );
}

function AnalysisContent() {
  const params = useParams<{ jobId: string }>();
  const searchParams = useSearchParams();
  const filenames = (searchParams.get("filenames") ?? "film.pdf").split(",");
  const state = useAnalysis(params.jobId, filenames[0]);

  const isDone = state.phase === "complete";
  const isError = state.phase === "error";

  return (
    <>
      <NavBar />
      <main>
        <header className="relative overflow-hidden border-b border-rule">
          <Haze active={!isDone && !isError} />
          <div className="relative max-w-[1240px] mx-auto px-4 md:px-8 pt-12 pb-8">
            <h1 className="text-31 sm:text-39 lg:text-[3.2rem] font-semibold leading-[1.04] tracking-[-0.03em] mb-2">
              {state.filmTitle}
            </h1>
            <p className="text-13 text-graphite">
              {filenames.length === 1
                ? filenames[0]
                : `${filenames.length} documents: ${filenames.slice(0, 3).join(", ")}${
                    filenames.length > 3 ? `, and ${filenames.length - 3} more` : ""
                  }`}
            </p>
            {!isDone && !isError && <Progress state={state} />}
          </div>
        </header>

        <div className="max-w-[1240px] mx-auto px-4 md:px-8">
          {isError && <Failed message={state.error} />}
          {!isDone && !isError && <Running state={state} />}
          {isDone && (
            <>
              {state.bidRange && <BidBar title={state.filmTitle} bid={state.bidRange} trigger="#verdict [data-scale]" />}
              <Verdict state={state} />
              {state.report && (
                <div className="pt-12 pb-28">
                  <ReportDisplay report={state.report} />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-paper" />}>
      <AnalysisContent />
    </Suspense>
  );
}
