"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { BidRangeBar } from "@/components/trade/BidRangeBar";
import { VerdictBadge } from "@/components/trade/VerdictBadge";
import { compareReports } from "@/lib/api";
import { parseMoney, sharedScaleMax, type RiskItem, type ComparableDeal } from "@/lib/trade";

const DUOTONES = [
  "linear-gradient(165deg,#0e2233,#3a5a74)",
  "linear-gradient(165deg,#4a3120,#8a6a45)",
  "linear-gradient(165deg,#22301c,#54683f)",
  "linear-gradient(165deg,#2b1e33,#6a4a74)",
];

const VERDICT_RANK: Record<string, number> = { PURSUE: 2, CAUTION: 1, PASS: 0 };
const SEVERITY_SCORE: Record<string, number> = { low: 1, med: 2, high: 3 };

function riskLevel(risks: RiskItem[] | undefined): { label: string; avg: number } {
  if (!risks || risks.length === 0) return { label: "—", avg: 0 };
  const avg = risks.reduce((sum, r) => sum + (SEVERITY_SCORE[r.severity] ?? 2), 0) / risks.length;
  const label = avg < 1.67 ? "LOW" : avg < 2.34 ? "MEDIUM" : "HIGH";
  return { label, avg };
}

function bestComp(comparables: ComparableDeal[] | undefined): { label: string; price: number } {
  if (!comparables || comparables.length === 0) return { label: "—", price: 0 };
  let best = comparables[0];
  let bestPrice = 0;
  for (const c of comparables) {
    const price = parseMoney(c.price);
    if (price > bestPrice) {
      bestPrice = price;
      best = c;
    }
  }
  return { label: `${best.title} (${best.price})`, price: bestPrice };
}

function excerpt(text: string | undefined, max = 90): string {
  if (!text) return "No findings.";
  const clean = text
    .replace(/\[PDF p\.\d+\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

function winnerShadow(isWinner: boolean): string | undefined {
  return isWinner ? "inset 3px 0 0 #2f7d52" : undefined;
}

interface Report {
  id: string;
  title: string;
  genre?: string;
  director?: string;
  deal_score?: number;
  verdict?: string;
  bid_range?: { low: string | null; fair: string | null; walk_away: string | null };
  risks?: RiskItem[];
  comparables?: ComparableDeal[];
  specialist_findings?: Record<string, string>;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);

  const [reports, setReports] = useState<Report[]>([]);
  const [verdict, setVerdict] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length < 2) {
      setError("Select at least 2 films to compare.");
      setLoading(false);
      return;
    }
    compareReports(ids)
      .then((res) => {
        setReports(res.reports as unknown as Report[]);
        setVerdict(res.verdict);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load comparison."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  if (loading) {
    return <p style={{ padding: 32, fontSize: 13, color: "#837b6c" }}>Loading comparison…</p>;
  }
  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ fontSize: 14, color: "#c94f32" }}>{error}</p>
        <Link href="/deals" style={{ fontSize: 13, color: "#5c564a" }}>← Back to Deal Room</Link>
      </div>
    );
  }

  const scaleMax = sharedScaleMax(reports.map((r) => r.bid_range?.walk_away ?? null));
  const scores = reports.map((r) => r.deal_score ?? 0);
  const scoreWinner = scores.indexOf(Math.max(...scores));
  const verdictRanks = reports.map((r) => VERDICT_RANK[r.verdict ?? ""] ?? -1);
  const verdictWinner = verdictRanks.indexOf(Math.max(...verdictRanks));
  const risks = reports.map((r) => riskLevel(r.risks));
  const riskWinner = risks.reduce((best, r, i) => (r.avg > 0 && (risks[best].avg === 0 || r.avg < risks[best].avg) ? i : best), 0);
  const comps = reports.map((r) => bestComp(r.comparables));
  const compWinner = comps.reduce((best, c, i) => (c.price > comps[best].price ? i : best), 0);

  const rows: { label: string; cells: string[]; winner?: number }[] = [
    { label: "DEAL SCORE", cells: scores.map(String), winner: scoreWinner },
    { label: "VERDICT", cells: reports.map((r) => r.verdict ?? "—"), winner: verdictWinner },
    { label: "RISK LEVEL", cells: risks.map((r) => r.label), winner: riskWinner },
    { label: "TALENT", cells: reports.map((r) => excerpt(r.specialist_findings?.talent_researcher)) },
    { label: "BUZZ", cells: reports.map((r) => excerpt(r.specialist_findings?.buzz_analyst)) },
    { label: "BEST COMP", cells: comps.map((c) => c.label), winner: compWinner },
  ];

  return (
    <div style={{ background: "#f7f3ec", minHeight: "100dvh" }}>
      <NavBar sectionLabel="DEAL ROOM / COMPARE">
        <Link href="/deals" className="btn-tertiary">+ Add film</Link>
        <button onClick={() => window.print()} className="btn-tertiary">Export ⤓</button>
      </NavBar>

      <div className="animate-fq-up" style={{ padding: "36px 32px 20px" }}>
        <h1 className="font-display" style={{ fontSize: 46, lineHeight: 1, color: "#1a160f" }}>Head to head</h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#837b6c" }}>
          {reports.length} films · shared bid scale $0 – ${(scaleMax / 1_000_000).toFixed(1)}M · ★ marks the stronger position where measurable
        </p>
      </div>

      <div
        className="grid animate-fq-up overflow-hidden"
        style={{
          margin: "0 32px",
          gridTemplateColumns: `170px repeat(${reports.length}, 1fr)`,
          gap: 1,
          background: "rgba(26,22,15,.12)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
        }}
      >
        <div style={{ background: "#f2ede2", padding: 18 }} />
        {reports.map((r, i) => (
          <div key={r.id} style={{ background: "#fffdf9", padding: 18, borderTop: i === scoreWinner ? "3px solid #2f7d52" : undefined }}>
            <div
              className="flex items-center justify-center"
              style={{ height: 44, borderRadius: 6, background: DUOTONES[i % DUOTONES.length], marginBottom: 10 }}
            >
              <span className="font-display italic" style={{ fontSize: 26, color: "rgba(255,253,249,.5)" }}>
                {r.title.charAt(0)}
              </span>
            </div>
            <div className="font-display" style={{ fontSize: 21 }}>{r.title}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#837b6c" }}>
              {[r.genre, r.director].filter(Boolean).join(" · ").toUpperCase()}
            </div>
          </div>
        ))}

        {rows.map((row) => (
          <Fragment key={row.label}>
            <div className="flex items-center" style={{ background: "#f2ede2", padding: "14px 18px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "#837b6c" }}>
              {row.label}
            </div>
            {row.cells.map((cell, i) => (
              <div
                key={`${row.label}-${i}`}
                style={{ background: "#fffdf9", padding: "14px 18px", fontSize: 13.5, boxShadow: row.winner === i ? winnerShadow(true) : undefined }}
              >
                {cell}
                {row.winner === i && <span style={{ color: "#2f7d52", fontWeight: 700 }}> ★</span>}
              </div>
            ))}
          </Fragment>
        ))}

        <div className="flex items-center" style={{ background: "#f2ede2", padding: "14px 18px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "#837b6c" }}>
          BID RANGE
        </div>
        {reports.map((r) => (
          <div key={`bid-${r.id}`} style={{ background: "#fffdf9", padding: 18 }}>
            <BidRangeBar
              low={r.bid_range?.low}
              fair={r.bid_range?.fair}
              walkAway={r.bid_range?.walk_away}
              verdict={r.verdict}
              scaleMax={scaleMax}
              height={8}
              showLabels={false}
            />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#5c564a", marginTop: 6 }}>
              {r.bid_range?.low ?? "—"} — <b>{r.bid_range?.fair ?? "—"}</b> — {r.bid_range?.walk_away ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {verdict && (
        <div
          className="flex gap-4 items-start animate-fq-up"
          style={{ margin: "18px 32px 28px", background: "#1a160f", color: "#fffdf9", borderRadius: 12, padding: "20px 24px" }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", color: "#c94f32", paddingTop: 5, flexShrink: 0 }}>
            STRATEGIST VERDICT
          </span>
          <p className="font-display italic" style={{ margin: 0, fontSize: 19, lineHeight: 1.45, color: "rgba(255,253,249,.92)" }}>
            &ldquo;{verdict}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<p style={{ padding: 32, fontSize: 13, color: "#837b6c" }}>Loading…</p>}>
      <CompareContent />
    </Suspense>
  );
}
