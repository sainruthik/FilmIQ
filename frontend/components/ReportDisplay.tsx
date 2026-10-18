"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BidRange } from "@/lib/useAnalysis";

/* ── BidRangeCard ────────────────────────────────────────────────────────── */

type Trend = "up" | "down" | "neutral";

function TrendIcon({ trend, color }: { trend: Trend; color: string }) {
  const size = 14;
  if (trend === "up")
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <polyline points="2,10 7,4 12,10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (trend === "down")
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <polyline points="2,4 7,10 12,4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <line x1="2" y1="7" x2="12" y2="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BidPanel({
  label,
  value,
  description,
  accent,
  trend,
  highlight,
}: {
  label: string;
  value: string | null;
  description: string;
  accent: string;
  trend: Trend;
  highlight?: boolean;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 90, damping: 22 } },
      }}
      // Stacked on mobile with Fair Value first; side by side from sm up.
      className={`relative flex flex-col items-center justify-center gap-3 px-6 py-7 sm:py-9 text-center overflow-hidden border-cream/10 border-b last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${
        highlight ? "order-first sm:order-none" : ""
      }`}
    >
      {/* Spotlight on highlight column */}
      {highlight && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgb(var(--accent-rgb) / 0.1) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Label row */}
      <div className="flex items-center gap-1.5 relative">
        <TrendIcon trend={trend} color={accent} />
        <span
          className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em]"
          style={{ color: accent }}
        >
          {label}
        </span>
      </div>

      {/* Value — the hero element */}
      <p
        className="font-display leading-none tabular-nums relative"
        style={{
          fontSize: "clamp(1.8rem,3.5vw,2.6rem)",
          color: highlight ? "var(--color-gold)" : "var(--color-text)",
          textShadow: highlight ? "0 0 40px rgb(var(--accent-rgb) / 0.25)" : undefined,
        }}
      >
        {value ?? "—"}
      </p>

      {/* Description */}
      <p
        className="text-[12px] font-sans leading-relaxed relative"
        style={{ color: "var(--color-text-dim)" }}
      >
        {description}
      </p>

      {/* Accent underline on highlighted column */}
      {highlight && (
        <div
          className="absolute bottom-0 left-8 right-8 h-[2px] rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgb(var(--accent-rgb) / 0.5), transparent)",
          }}
        />
      )}
    </motion.div>
  );
}

const CONFIDENCE_COLOR: Record<NonNullable<BidRange["confidence"]>, string> = {
  High: "rgb(var(--success-rgb) / 0.85)",
  Medium: "rgb(var(--warn-rgb))",
  Low: "rgb(var(--fg-rgb) / 0.6)",
};

function ConfidenceBadge({ level, priced }: { level: NonNullable<BidRange["confidence"]>; priced: number }) {
  const color = CONFIDENCE_COLOR[level];
  return (
    <span
      className="mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-sans font-semibold uppercase tracking-[0.08em] sm:tracking-[0.18em] whitespace-nowrap"
      style={{ color, border: `1px solid ${color}`, background: "var(--color-surface)" }}
      title="Counted from comparable deals with a disclosed price: High 2+, Medium 1, Low none"
    >
      {level} confidence · {priced} priced comparable{priced === 1 ? "" : "s"}
    </span>
  );
}

function BidRangeCard({ bid }: { bid: BidRange | null }) {
  if (!bid || (!bid.low && !bid.fair && !bid.walk_away)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring" as const, stiffness: 70, damping: 22, delay: 0.25 }}
      className="mt-4 mb-12 print:mt-12 rounded-3xl overflow-hidden relative"
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid rgb(var(--accent-rgb) / 0.45)",
        boxShadow:
          "0 0 80px rgb(var(--accent-rgb) / 0.06), 0 0 0 1px rgb(var(--accent-rgb) / 0.06) inset",
      }}
    >
      {/* Top ambient spotlight */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgb(var(--accent-rgb) / 0.1) 0%, transparent 65%)",
        }}
      />

      {/* ── Card header ── */}
      <div
        className="relative px-4 sm:px-8 pt-8 pb-6 flex flex-col items-center gap-2"
        style={{ borderBottom: "1px solid rgb(var(--accent-rgb) / 0.15)" }}
      >
        {/* Ornament line */}
        <div className="flex items-center gap-4 w-full max-w-xs justify-center">
          <div
            className="flex-1 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgb(var(--accent-rgb) / 0.45))",
            }}
          />
          <span
            className="text-[11px] font-sans font-semibold uppercase tracking-[0.3em]"
            style={{ color: "var(--color-gold)", opacity: 0.85 }}
          >
            Acquisition Valuation
          </span>
          <div
            className="flex-1 h-px"
            style={{
              background:
                "linear-gradient(-90deg, transparent, rgb(var(--accent-rgb) / 0.45))",
            }}
          />
        </div>
        <p
          className="font-display"
          style={{ fontSize: "clamp(1.5rem,3vw,2rem)", color: "var(--color-text)" }}
        >
          Recommended Bid Range
        </p>
        {bid.confidence && <ConfidenceBadge level={bid.confidence} priced={bid.priced_comparables ?? 0} />}
      </div>

      {/* ── Three panels ── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3"
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: 0.1, delayChildren: 0.35 },
          },
        }}
        initial="hidden"
        animate="show"
      >
        <BidPanel
          label="Low Bid"
          value={bid.low ?? null}
          description="Entry threshold"
          accent="rgb(var(--info-rgb) / 0.8)"
          trend="down"
        />
        <BidPanel
          label="Fair Value"
          value={bid.fair ?? null}
          description="Recommended offer"
          accent="var(--color-gold)"
          trend="neutral"
          highlight
        />
        <BidPanel
          label="Walk-Away"
          value={bid.walk_away ? `> ${bid.walk_away}` : null}
          description="Maximum threshold"
          accent="rgb(var(--danger-rgb) / 0.85)"
          trend="up"
        />
      </motion.div>
    </motion.div>
  );
}

/* ── ReportDisplay ───────────────────────────────────────────────────────── */

interface Props {
  report: string;
  filmTitle: string;
  bidRange: BidRange | null;
}

export function ReportDisplay({ report, filmTitle, bidRange }: Props) {
  return (
    <div>
      {/* ── Dossier header ── print only; on screen the page header already names the film */}
      <div className="hidden print:block mb-10">
        <div
          className="h-px w-full mb-8"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgb(var(--accent-rgb) / 0.35) 30%, rgb(var(--accent-rgb) / 0.35) 70%, transparent)",
          }}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[11px] font-sans font-semibold uppercase tracking-[0.28em] mb-2"
              style={{ color: "var(--color-gold)", opacity: 0.85 }}
            >
              Acquisition Analysis Report
            </p>
            <h2
              className="font-display leading-tight"
              style={{
                fontSize: "clamp(1.7rem,3vw,2.4rem)",
                color: "var(--color-text)",
              }}
            >
              {filmTitle}
            </h2>
          </div>
          <p
            className="hidden sm:block text-[11px] font-sans shrink-0 mt-2"
            style={{ color: "var(--color-text-dim)" }}
          >
            AI-powered due diligence
          </p>
        </div>
        <div
          className="h-px w-full mt-8"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgb(var(--accent-rgb) / 0.18) 30%, rgb(var(--accent-rgb) / 0.18) 70%, transparent)",
          }}
        />
      </div>

      {/* ── Bid range card — first for impact ── */}
      <BidRangeCard bid={bidRange} />

      {/* ── Report body ── */}
      <div
        className="font-sans"
        style={{ color: "var(--color-text)", lineHeight: 1.78 }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1
                className="font-display mt-12 mb-5"
                style={{
                  fontSize: "clamp(1.4rem,2.5vw,1.9rem)",
                  color: "var(--color-text)",
                }}
              >
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ type: "spring" as const, stiffness: 90, damping: 22 }}
                className="mt-12 mb-5"
              >
                <div className="flex items-center gap-3">
                  {/* Accent bar */}
                  <div
                    className="w-[3px] h-6 rounded-full shrink-0"
                    style={{
                      background:
                        "linear-gradient(180deg, var(--color-gold), rgb(var(--accent-rgb) / 0.3))",
                    }}
                  />
                  <h2
                    className="font-display"
                    style={{
                      fontSize: "clamp(1.1rem,2vw,1.5rem)",
                      color: "var(--color-text)",
                    }}
                  >
                    {children}
                  </h2>
                </div>
                <div
                  className="mt-3 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, rgb(var(--accent-rgb) / 0.2), rgb(var(--accent-rgb) / 0.05) 40%, transparent)",
                  }}
                />
              </motion.div>
            ),
            h3: ({ children }) => (
              <h3
                className="font-display mt-7 mb-2 gold-text-dim"
                style={{ fontSize: "clamp(1rem,1.8vw,1.25rem)" }}
              >
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p
                className="text-[15px] mb-4 leading-[1.8]"
                style={{ color: "var(--color-text)" }}
              >
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong
                className="font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                {children}
              </strong>
            ),
            ul: ({ children }) => (
              <ul className="list-none space-y-2 mb-5 pl-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-2 mb-5 pl-3">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li
                className="text-[15px] flex gap-2.5 items-start"
                style={{ color: "var(--color-text)" }}
              >
                <span
                  className="mt-[9px] shrink-0 w-1 h-1 rounded-full"
                  style={{ background: "var(--color-gold)", opacity: 0.55 }}
                />
                <span className="leading-[1.75]">{children}</span>
              </li>
            ),
            table: ({ children }) => (
              <div
                className="my-7 rounded-xl overflow-x-auto"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <table className="report-table">{children}</table>
              </div>
            ),
            th: ({ children }) => <th>{children}</th>,
            td: ({ children }) => <td>{children}</td>,
            blockquote: ({ children }) => (
              <blockquote
                className="pl-5 py-1 my-5 italic text-[13.5px]"
                style={{
                  borderLeft: "3px solid rgb(var(--accent-rgb) / 0.38)",
                  color: "var(--color-text-muted)",
                }}
              >
                {children}
              </blockquote>
            ),
            hr: () => (
              <div
                className="my-10 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--color-border-accent), transparent)",
                }}
              />
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-sans text-[13px] font-medium transition-colors hover:opacity-80"
                style={{
                  color: "var(--color-gold)",
                  textDecoration: "underline",
                  textDecorationColor: "rgb(var(--accent-rgb) / 0.32)",
                  textUnderlineOffset: "3px",
                }}
              >
                {children}
              </a>
            ),
            code: ({ children }) => (
              <code
                className="text-[12px] px-1.5 py-0.5 rounded font-mono"
                style={{
                  background: "rgb(var(--accent-rgb) / 0.07)",
                  color: "var(--color-gold)",
                  border: "1px solid rgb(var(--accent-rgb) / 0.14)",
                }}
              >
                {children}
              </code>
            ),
          }}
        >
          {report}
        </ReactMarkdown>
      </div>
    </div>
  );
}
