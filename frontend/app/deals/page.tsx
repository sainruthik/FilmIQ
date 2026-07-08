"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { BidRangeBar } from "@/components/trade/BidRangeBar";
import { VerdictBadge } from "@/components/trade/VerdictBadge";
import { listReports, type ReportSummary } from "@/lib/api";
import { isVerdict, parseMoney, sharedScaleMax, type Verdict } from "@/lib/trade";

const DUOTONES = [
  "linear-gradient(165deg,#0e2233,#3a5a74)",
  "linear-gradient(165deg,#4a3120,#8a6a45)",
  "linear-gradient(165deg,#22301c,#54683f)",
  "linear-gradient(165deg,#2b1e33,#6a4a74)",
  "linear-gradient(165deg,#331e1e,#744a4a)",
  "linear-gradient(165deg,#1e2b33,#4a6a74)",
];

type FilterKey = "all" | Verdict;

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DealRoomPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "grid">("table");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: reports.length, PURSUE: 0, CAUTION: 0, PASS: 0 };
    for (const r of reports) {
      if (isVerdict(r.verdict)) c[r.verdict] += 1;
    }
    return c;
  }, [reports]);

  const filtered = useMemo(
    () => (filter === "all" ? reports : reports.filter((r) => r.verdict === filter)),
    [reports, filter]
  );

  const scaleMax = useMemo(() => sharedScaleMax(filtered.map((r) => r.bid_walk_away)), [filtered]);

  const avgScore = reports.length
    ? Math.round(reports.reduce((sum, r) => sum + (r.deal_score ?? 0), 0) / reports.length)
    : 0;
  const pipelineValue = reports.reduce((sum, r) => sum + parseMoney(r.bid_fair), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goCompare() {
    router.push(`/compare?ids=${Array.from(selected).join(",")}`);
  }

  const selectedTitles = filtered.filter((r) => selected.has(r.id)).map((r) => r.title);

  return (
    <div style={{ background: "#f7f3ec", minHeight: "100dvh" }}>
      <NavBar sectionLabel={view === "table" ? "DEAL ROOM" : "YOUR SLATE"}>
        <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border-input)", fontSize: 12 }}>
          <button
            onClick={() => setView("grid")}
            style={{ padding: "6px 14px", background: view === "grid" ? "#1a160f" : "transparent", color: view === "grid" ? "#fffdf9" : "#5c564a" }}
          >
            Grid
          </button>
          <button
            onClick={() => setView("table")}
            style={{ padding: "6px 14px", background: view === "table" ? "#1a160f" : "transparent", color: view === "table" ? "#fffdf9" : "#5c564a" }}
          >
            Table
          </button>
        </div>
        <Link href="/" className="btn-primary">+ New analysis</Link>
      </NavBar>

      <div className="flex items-end gap-8 animate-fq-up" style={{ padding: "36px 32px 12px" }}>
        <h1 className="font-display" style={{ fontSize: 46, lineHeight: 1, color: "#1a160f" }}>
          {view === "table" ? "Deal Room" : "Your slate"}
        </h1>
        <div className="flex-1" />
        {view === "table" && (
          <div className="flex">
            <div style={{ padding: "0 24px", borderLeft: "1px solid var(--color-border)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600 }}>{reports.length}</div>
              <div className="mono-label">FILMS ANALYZED</div>
            </div>
            <div style={{ padding: "0 24px", borderLeft: "1px solid var(--color-border)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600 }}>{avgScore}</div>
              <div className="mono-label">AVG DEAL SCORE</div>
            </div>
            <div style={{ padding: "0 24px", borderLeft: "1px solid var(--color-border)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "#2f7d52" }}>
                ${(pipelineValue / 1_000_000).toFixed(1)}M
              </div>
              <div className="mono-label">FAIR-VALUE PIPELINE</div>
            </div>
          </div>
        )}
      </div>

      {view === "table" && (
        <div className="flex gap-2 animate-fq-up" style={{ padding: "16px 32px" }}>
          {(["all", "PURSUE", "CAUTION", "PASS"] as FilterKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="rounded-full"
              style={{
                fontSize: 12,
                fontWeight: filter === key ? 600 : 400,
                background: filter === key ? "#1a160f" : "transparent",
                color: filter === key ? "#fffdf9" : "#5c564a",
                border: filter === key ? "none" : "1px solid var(--color-border-input)",
                padding: "5px 14px",
              }}
            >
              {key === "all" ? "All" : key.charAt(0) + key.slice(1).toLowerCase()} · {counts[key]}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p style={{ padding: "0 32px", fontSize: 13, color: "#837b6c" }}>Loading reports…</p>
      )}

      {!loading && filtered.length === 0 && (
        <p style={{ padding: "0 32px", fontSize: 13, color: "#837b6c" }}>
          No analyses yet. <Link href="/" style={{ color: "#c94f32" }}>Run your first analysis →</Link>
        </p>
      )}

      {!loading && view === "table" && filtered.length > 0 && (
        <div className="trade-card animate-fq-up overflow-hidden" style={{ margin: "4px 32px 0" }}>
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns: "44px 280px 110px 90px 1fr 130px 40px",
              gap: 12,
              padding: "10px 20px",
              borderBottom: "1px solid var(--color-border)",
              background: "#f2ede2",
            }}
          >
            <span />
            <span className="mono-label">FILM</span>
            <span className="mono-label">ANALYZED</span>
            <span className="mono-label">SCORE</span>
            <span className="mono-label">BID RANGE (LOW — FAIR — WALK)</span>
            <span className="mono-label">VERDICT</span>
            <span />
          </div>
          {filtered.map((r) => (
            <div
              key={r.id}
              className="grid items-center row-hover"
              style={{
                gridTemplateColumns: "44px 280px 110px 90px 1fr 130px 40px",
                gap: 12,
                padding: "14px 20px",
                borderBottom: "1px solid var(--color-border-row)",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                style={{ width: 15, height: 15, accentColor: "#c94f32" }}
              />
              <div>
                <div className="font-display" style={{ fontSize: 19, lineHeight: 1.15 }}>{r.title}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#837b6c", marginTop: 2 }}>
                  {[r.genre, r.director].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#5c564a" }}>{formatDate(r.created_at)}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 600, color: isVerdict(r.verdict) ? undefined : "#5c564a" }}>
                {r.deal_score ?? "—"}
              </span>
              <BidRangeBar low={r.bid_low} fair={r.bid_fair} walkAway={r.bid_walk_away} verdict={r.verdict} scaleMax={scaleMax} />
              <VerdictBadge verdict={r.verdict} />
              <Link href={`/analyze/${r.id}`} style={{ color: "#b3aa99", fontSize: 16 }}>→</Link>
            </div>
          ))}
        </div>
      )}

      {!loading && view === "grid" && filtered.length > 0 && (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3,1fr)", padding: "24px 32px" }}>
          {filtered.map((r, i) => (
            <div key={r.id} className="trade-card poster-card-hover animate-fq-up overflow-hidden">
              <div className="relative flex items-center justify-center" style={{ height: 190, background: DUOTONES[i % DUOTONES.length] }}>
                <span className="font-display italic" style={{ fontSize: 92, color: "rgba(255,253,249,.28)", lineHeight: 1 }}>
                  {r.title.charAt(0)}
                </span>
                {r.genre && (
                  <span
                    className="absolute"
                    style={{ top: 12, left: 12, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", color: "rgba(255,253,249,.85)", border: "1px solid rgba(255,253,249,.4)", borderRadius: 4, padding: "2px 8px" }}
                  >
                    {r.genre.toUpperCase()}
                  </span>
                )}
                <span className="absolute" style={{ top: 12, right: 12 }}>
                  <VerdictBadge verdict={r.verdict} solid />
                </span>
              </div>
              <div style={{ padding: "16px 18px 18px" }}>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-display flex-1" style={{ fontSize: 22, lineHeight: 1.1 }}>{r.title}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600 }}>{r.deal_score ?? "—"}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#837b6c", margin: "4px 0 12px" }}>
                  {formatDate(r.created_at)}
                </div>
                <BidRangeBar low={r.bid_low} fair={r.bid_fair} walkAway={r.bid_walk_away} verdict={r.verdict} scaleMax={scaleMax} height={5} showLabels={false} />
                <div className="flex justify-between mt-1.5" style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#837b6c" }}>
                  <span>{r.bid_low ?? "—"}</span>
                  <span>{r.bid_walk_away ?? "—"}</span>
                </div>
                <button
                  onClick={() => toggle(r.id)}
                  className="mt-3 rounded-full"
                  style={{
                    fontSize: 11,
                    padding: "4px 12px",
                    border: selected.has(r.id) ? "1px solid #1a160f" : "1px dashed rgba(26,22,15,.25)",
                    color: selected.has(r.id) ? "#1a160f" : "#b3aa99",
                  }}
                >
                  {selected.has(r.id) ? "Added to tray ✓" : "+ Add to compare"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected.size > 0 && view === "table" && (
        <div
          className="flex items-center gap-3.5 animate-fq-up"
          style={{ margin: "14px 32px 28px", background: "#1a160f", color: "#fffdf9", borderRadius: 10, padding: "12px 20px" }}
        >
          <span className="rounded-full animate-fq-dot" style={{ width: 8, height: 8, background: "#c94f32" }} />
          <span style={{ fontSize: 13 }}>
            {selected.size} film{selected.size === 1 ? "" : "s"} selected — <b>{selectedTitles.join(", ")}</b>
          </span>
          <div className="flex-1" />
          <button onClick={() => setSelected(new Set())} style={{ fontSize: 12, color: "rgba(255,253,249,.55)" }}>Clear</button>
          <button onClick={goCompare} disabled={selected.size < 2} className="btn-primary disabled:opacity-40">
            Compare {selected.size} →
          </button>
        </div>
      )}

      {selected.size > 0 && view === "grid" && (
        <div
          className="flex items-center gap-3 animate-fq-up"
          style={{ margin: "6px 32px 28px", background: "#fffdf9", border: "1px solid #1a160f", borderRadius: 10, padding: "12px 20px", boxShadow: "0 8px 24px rgba(26,22,15,.12)" }}
        >
          <span className="mono-label">COMPARE TRAY</span>
          {selectedTitles.map((t) => (
            <span key={t} className="rounded-full" style={{ fontSize: 12, border: "1px solid rgba(26,22,15,.2)", padding: "4px 12px" }}>
              {t}
            </span>
          ))}
          <div className="flex-1" />
          <button onClick={goCompare} disabled={selected.size < 2} className="btn-dark disabled:opacity-40">
            Compare {selected.size} →
          </button>
        </div>
      )}
    </div>
  );
}
