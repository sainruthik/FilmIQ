"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BidRange } from "@/lib/useAnalysis";
import type { ComparableDeal, RiskItem } from "@/lib/trade";
import { parseMoney, verdictColor } from "@/lib/trade";
import { ScoreRing } from "@/components/trade/ScoreRing";
import { RiskMatrix } from "@/components/trade/RiskMatrix";
import { ComparablesTable } from "@/components/trade/ComparablesTable";

type Tab = "summary" | "talent" | "market" | "deals" | "risks" | "bid";

const TABS: { key: Tab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "talent", label: "Talent" },
  { key: "market", label: "Market" },
  { key: "deals", label: "Deals" },
  { key: "risks", label: "Risks" },
  { key: "bid", label: "Bid rationale" },
];

/** Turn "[PDF p.N]" into a fake link the markdown renderer's `a` component can
 * style as a citation chip, alongside real "[Name](url)" web citations. */
function citationize(markdown: string): string {
  return markdown.replace(/\[PDF p\.(\d+)\]/g, "[PDF p.$1](pdf://$1)");
}

function CitationLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (href?.startsWith("pdf://")) {
    return <span className="citation-chip citation-chip-pdf">{children}</span>;
  }
  let label: React.ReactNode = children;
  try {
    const domain = new URL(href ?? "").hostname.replace(/^www\./, "");
    label = `WEB · ${domain.toUpperCase()}`;
  } catch {
    // not a real URL — fall back to the link text as-is
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="citation-chip citation-chip-web"
      style={{ textDecoration: "none" }}
    >
      {label}
    </a>
  );
}

const MARKDOWN_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="font-display" style={{ fontSize: "1.7rem", margin: "28px 0 14px", color: "#1a160f" }}>
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="font-display" style={{ fontSize: "1.3rem", margin: "24px 0 10px", color: "#1a160f" }}>
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="font-display" style={{ fontSize: "1.1rem", margin: "18px 0 8px", color: "#3a352b" }}>
      {children}
    </h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "#3a352b", margin: "0 0 14px" }}>{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: "0 0 14px", paddingLeft: 20, color: "#3a352b" }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: "0 0 14px", paddingLeft: 20, color: "#3a352b" }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ fontSize: 13.5, lineHeight: 1.8 }}>{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 600, color: "#1a160f" }}>{children}</strong>
  ),
  a: CitationLink,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="trade-card overflow-hidden my-4">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th style={{ background: "#f2ede2", padding: "8px 14px", textAlign: "left", fontSize: 11, color: "#837b6c" }}>
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td style={{ padding: "8px 14px", borderTop: "1px solid var(--color-border-row)" }}>{children}</td>
  ),
};

function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
      {citationize(content)}
    </ReactMarkdown>
  );
}

interface Props {
  report: string;
  filmTitle: string;
  bidRange: BidRange | null;
  genre?: string | null;
  director?: string | null;
  dealScore?: number | null;
  verdict?: string | null;
  thesis?: string | null;
  bidRationale?: string | null;
  strengths?: string[];
  concerns?: string[];
  risks?: RiskItem[];
  comparables?: ComparableDeal[];
  specialistFindings?: Record<string, string>;
}

export function ReportDisplay({
  report,
  bidRange,
  genre,
  director,
  dealScore,
  verdict,
  thesis,
  bidRationale,
  strengths = [],
  concerns = [],
  risks = [],
  comparables = [],
  specialistFindings = {},
}: Props) {
  const [tab, setTab] = useState<Tab>("summary");

  const color = verdictColor(verdict);
  const low = parseMoney(bidRange?.low);
  const fair = parseMoney(bidRange?.fair);
  const walk = parseMoney(bidRange?.walk_away);
  const fairMarkerPct = walk > low ? Math.min(48, Math.max(18, 18 + ((fair - low) / (walk - low)) * 30)) : 33;

  const findingEntries = Object.values(specialistFindings);
  const totalFindings = findingEntries.length || 1;
  const incompleteCount = findingEntries.filter((v) => v.startsWith("Research incomplete")).length;
  const completeCount = totalFindings - incompleteCount;
  const confidenceLevel = incompleteCount === 0 ? "HIGH" : incompleteCount <= 1 ? "MEDIUM" : "LOW";

  return (
    <div className="flex gap-7" style={{ padding: "0 32px 32px" }}>
      {/* ── Left rail ── */}
      <div className="flex flex-col gap-4.5" style={{ width: 280, flexShrink: 0, gap: 18 }}>
        <div className="trade-card text-center" style={{ padding: 24 }}>
          <ScoreRing score={dealScore ?? 50} color={color} />
          <div
            className="mt-4"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: "#fffdf9",
              background: color,
              borderRadius: 6,
              padding: "8px 0",
            }}
          >
            VERDICT: {verdict ?? "CAUTION"}
          </div>
          <div className="mt-2" style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#837b6c" }}>
            CONFIDENCE {confidenceLevel} · {completeCount}/{totalFindings} SPECIALISTS COMPLETED
          </div>
        </div>

        <div className="trade-card" style={{ padding: 20 }}>
          <div className="mono-label" style={{ marginBottom: 14 }}>BID GUIDANCE</div>
          <div
            style={{
              position: "relative",
              height: 10,
              borderRadius: 99,
              background:
                "linear-gradient(90deg,rgba(26,22,15,.08) 0 18%,rgba(47,125,82,.35) 18% 48%,rgba(169,122,28,.35) 48% 78%,rgba(201,79,50,.35) 78% 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -4,
                bottom: -4,
                width: 3,
                borderRadius: 2,
                background: "#1a160f",
                left: `${fairMarkerPct}%`,
              }}
            />
            <div
              className="animate-fq-dot"
              style={{
                position: "absolute",
                top: -7,
                width: 16,
                height: 24,
                left: `calc(${fairMarkerPct}% - 7px)`,
                borderRadius: 4,
                background: "rgba(26,22,15,.12)",
              }}
            />
          </div>
          <div className="flex justify-between" style={{ marginTop: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{bidRange?.low ?? "—"}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.12em", color: "#837b6c" }}>OPENING</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "#2f7d52" }}>{bidRange?.fair ?? "—"}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.12em", color: "#837b6c" }}>FAIR VALUE</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "#c94f32" }}>{bidRange?.walk_away ?? "—"}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.12em", color: "#837b6c" }}>WALK-AWAY</div>
            </div>
          </div>
        </div>

        {thesis && (
          <div style={{ background: "#1a160f", color: "#fffdf9", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", color: "#c94f32", marginBottom: 8 }}>
              ONE-LINE THESIS
            </div>
            <p className="font-display italic" style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: "rgba(255,253,249,.92)" }}>
              &ldquo;{thesis}&rdquo;
            </p>
          </div>
        )}

        {(genre || director) && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#837b6c" }}>
            {[genre, director].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-6 border-b" style={{ borderColor: "var(--color-border)", marginBottom: 22 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                fontSize: 13,
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? "#1a160f" : "#837b6c",
                padding: "0 2px 12px",
                borderBottom: tab === t.key ? "2px solid #c94f32" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "summary" && (
          <>
            <Markdown content={report} />

            {(strengths.length > 0 || concerns.length > 0) && (
              <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 22 }}>
                {strengths.length > 0 && (
                  <div className="trade-card" style={{ borderLeft: "3px solid #2f7d52", padding: "16px 18px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", color: "#2f7d52", marginBottom: 10 }}>
                      STRENGTHS
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 2, color: "#3a352b" }}>
                      {strengths.map((s, i) => (
                        <div key={i}>{s}</div>
                      ))}
                    </div>
                  </div>
                )}
                {concerns.length > 0 && (
                  <div className="trade-card" style={{ borderLeft: "3px solid #c94f32", padding: "16px 18px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", color: "#c94f32", marginBottom: 10 }}>
                      CONCERNS
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 2, color: "#3a352b" }}>
                      {concerns.map((c, i) => (
                        <div key={i}>{c}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <RiskMatrix risks={risks} />
            <ComparablesTable deals={comparables} />
          </>
        )}

        {tab === "talent" && <Markdown content={specialistFindings.talent_researcher ?? "No findings."} />}
        {tab === "market" && <Markdown content={specialistFindings.market_analyst ?? "No findings."} />}
        {tab === "deals" && <Markdown content={specialistFindings.deals_researcher ?? "No findings."} />}
        {tab === "risks" && <Markdown content={specialistFindings.risk_analyst ?? "No findings."} />}
        {tab === "bid" && <Markdown content={bidRationale || "No bid rationale available."} />}
      </div>
    </div>
  );
}
