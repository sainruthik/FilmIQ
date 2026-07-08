"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { UploadZone } from "@/components/UploadZone";
import { VerdictBadge } from "@/components/trade/VerdictBadge";
import { BidRangeBar } from "@/components/trade/BidRangeBar";

const AGENT_NAMES = [
  "Document Analyst",
  "Talent Researcher",
  "Market Analyst",
  "Deals Researcher",
  "Buzz Analyst",
  "Risk Analyst",
];

const STATS = [
  { value: "7", label: "SPECIALIST AGENTS" },
  { value: "<5m", label: "TO FULL REPORT" },
  { value: "46", label: "SOURCES PER REPORT" },
];

export default function HomePage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden" style={{ background: "#f7f3ec" }}>
      <div className="film-strip-edge left-0" aria-hidden />
      <div className="film-strip-edge right-0" aria-hidden />

      <NavBar>
        <span style={{ fontSize: 13, color: "#5c564a" }}>How it works</span>
        <Link href="/deals" style={{ fontSize: 13, color: "#5c564a" }}>
          Deal Room
        </Link>
        <Link href="#upload" className="btn-primary">
          New analysis
        </Link>
      </NavBar>

      {/* ── Hero ── */}
      <section
        className="grid gap-12 items-center"
        style={{ gridTemplateColumns: "1.05fr 1fr", padding: "64px 60px 56px" }}
      >
        <div className="animate-fq-up">
          <div
            className="inline-flex items-center gap-2 rounded-full"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "#c94f32",
              border: "1px solid rgba(201,79,50,0.4)",
              padding: "6px 14px",
              marginBottom: 26,
            }}
          >
            <span
              className="rounded-full animate-fq-dot"
              style={{ width: 6, height: 6, background: "#c94f32" }}
            />
            AI ACQUISITION INTELLIGENCE
          </div>

          <h1
            className="font-display"
            style={{ fontSize: "clamp(2.4rem,4.5vw,4rem)", lineHeight: 1.04, letterSpacing: "-0.01em", color: "#1a160f" }}
          >
            Know what a film is worth — <em style={{ color: "#c94f32", fontStyle: "italic" }}>in minutes.</em>
          </h1>

          <p style={{ margin: "22px 0 0", fontSize: 16, lineHeight: 1.7, color: "#5c564a", maxWidth: 440 }}>
            Upload a script, press kit, or lookbook. Seven specialist AI agents return a cited
            acquisition report with a three-tier bid range.
          </p>

          <div className="flex gap-9" style={{ marginTop: 36 }}>
            {STATS.map((stat, i) => (
              <div key={stat.label} style={i > 0 ? { borderLeft: "1px solid rgba(26,22,15,0.14)", paddingLeft: 36 } : undefined}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color: "#1a160f" }}>
                  {stat.value}
                </div>
                <div className="mono-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-fq-up" style={{ animationDelay: "0.15s" }} id="upload">
          {/* Floating sample report teaser */}
          <div
            className="absolute animate-fq-float trade-card"
            style={{
              top: -34,
              right: -8,
              width: 230,
              padding: "16px 18px",
              boxShadow: "0 14px 34px rgba(26,22,15,0.14)",
              zIndex: 2,
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", color: "#c94f32", marginBottom: 6 }}>
              SAMPLE REPORT · LIVE
            </div>
            <div className="font-display" style={{ fontSize: 18, color: "#1a160f" }}>
              Midnight Harbor
            </div>
            <div className="flex items-center gap-1.5" style={{ margin: "8px 0 10px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "#2f7d52" }}>82</span>
              <VerdictBadge verdict="PURSUE" solid />
            </div>
            <BidRangeBar low="$500K" fair="$850K" walkAway="$1.2M" verdict="PURSUE" scaleMax={1_200_000} height={5} />
          </div>

          <div style={{ marginTop: 26 }}>
            <UploadZone />
          </div>
        </div>
      </section>

      {/* ── Footer strip ── */}
      <div
        className="flex items-center gap-2.5 border-t"
        style={{ padding: "16px 44px", borderColor: "var(--color-border)", background: "#fffdf9" }}
      >
        <span className="mono-label">THE TEAM:</span>
        <span style={{ fontSize: 11.5, color: "#5c564a" }}>
          {AGENT_NAMES.join(" · ")} · <b style={{ color: "#1a160f" }}>Acquisitions Strategist</b>
        </span>
        <div className="flex-1" />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#b3aa99" }}>
          CITED SOURCES IN EVERY REPORT
        </span>
      </div>
    </div>
  );
}
