"use client";

import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { UploadZone } from "@/components/UploadZone";
import {
  FileText,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Target,
} from "lucide-react";

const AGENTS = [
  { icon: FileText, name: "Document Analyst", desc: "Story · Genre · Budget · Rights", n: "01" },
  { icon: Users, name: "Talent Researcher", desc: "Director track record · Cast value", n: "02" },
  { icon: BarChart3, name: "Market Analyst", desc: "Streaming benchmarks · Comparables", n: "03" },
  { icon: DollarSign, name: "Deals Researcher", desc: "Acquisition deals · Pricing anchors", n: "04" },
  { icon: TrendingUp, name: "Buzz Analyst", desc: "Festival buzz · Critic sentiment", n: "05" },
  { icon: ShieldAlert, name: "Risk Analyst", desc: "Red flags · Risk register", n: "06" },
  { icon: Target, name: "Acquisitions Strategist", desc: "Bid range · Final recommendation", n: "07" },
];

const STEPS = [
  {
    n: "01",
    title: "Upload",
    desc: "Drop your film PDF — press kit, script, or financial summary. Multiple documents supported for deeper diligence.",
  },
  {
    n: "02",
    title: "AI Team Analyzes",
    desc: "7 specialist agents run in sequence, each focused on a distinct dimension: story, talent, market, deals, buzz, risk, strategy.",
  },
  {
    n: "03",
    title: "Receive Report",
    desc: "A structured acquisition report with cited sources, risk register, and a justified bid range — ready for your investment committee.",
  },
];

const spring = { type: "spring" as const, stiffness: 90, damping: 22 };

const leftContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fromLeft = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: spring },
};

const fromRight = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: { ...spring, delay: 0.15 } },
};

export default function HomePage() {
  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
      <NavBar />

      {/* ── HERO ── asymmetric split: text left, upload right */}
      <section className="relative min-h-[100dvh] flex items-center pt-14 overflow-hidden">
        {/* Film strip left edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-6 opacity-25 pointer-events-none"
          aria-hidden
          style={{
            background:
              "repeating-linear-gradient(180deg, transparent 0, transparent 14px, rgba(201,168,76,0.45) 14px, rgba(201,168,76,0.45) 20px)",
          }}
        />
        {/* Film strip right edge */}
        <div
          className="absolute right-0 top-0 bottom-0 w-6 opacity-25 pointer-events-none"
          aria-hidden
          style={{
            background:
              "repeating-linear-gradient(180deg, transparent 0, transparent 14px, rgba(201,168,76,0.45) 14px, rgba(201,168,76,0.45) 20px)",
          }}
        />

        {/* Ambient glow */}
        <div
          className="absolute top-1/4 right-[15%] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 68%)" }}
        />
        <div
          className="absolute bottom-0 left-[20%] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)" }}
        />

        <div className="max-w-6xl mx-auto w-full px-10 grid lg:grid-cols-[1fr_1.15fr] gap-16 items-center py-20">
          {/* LEFT: headline + stats */}
          <motion.div
            className="flex flex-col gap-9"
            variants={leftContainer}
            initial="hidden"
            animate="show"
          >
            {/* Badge */}
            <motion.div variants={fromLeft}>
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-[0.16em]"
                style={{
                  background: "rgba(201,168,76,0.07)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  color: "var(--color-gold)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                AI Acquisition Intelligence
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fromLeft}
              className="font-display leading-[1.06] tracking-tight"
              style={{ fontSize: "clamp(2.4rem,4.5vw,4.2rem)" }}
            >
              <span className="gold-text">Film due diligence,</span>
              <br />
              <span style={{ color: "var(--color-text)" }}>done in minutes.</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={fromLeft}
              className="text-[15.5px] leading-[1.7] font-sans max-w-[420px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Upload a film document and our specialist AI team delivers a complete
              acquisition report — story analysis, talent valuation, market comps,
              risk register, and a justified bid range.
            </motion.p>

            {/* Stats row */}
            <motion.div variants={fromLeft} className="flex items-center gap-7">
              {[
                { val: "7", label: "Specialist Agents" },
                { val: "<5m", label: "Analysis Time" },
                { val: "10+", label: "Docs Per Job" },
              ].map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-7">
                  <div>
                    <p className="font-display text-[2rem] leading-none gold-text">{stat.val}</p>
                    <p
                      className="text-[9px] font-sans uppercase tracking-[0.14em] mt-1"
                      style={{ color: "var(--color-text-dim)" }}
                    >
                      {stat.label}
                    </p>
                  </div>
                  {i < 2 && (
                    <div
                      className="h-8 w-px shrink-0"
                      style={{ background: "var(--color-border)" }}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT: upload zone */}
          <motion.div variants={fromRight} initial="hidden" animate="show">
            <UploadZone />
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── zigzag alternating layout */}
      <section
        className="py-28 px-10 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring" as const, stiffness: 80, damping: 20 }}
            className="mb-20"
          >
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.22em] text-gold mb-3">
              Process
            </p>
            <h2
              className="font-display tracking-tight"
              style={{ fontSize: "clamp(1.9rem,3.2vw,2.8rem)", color: "var(--color-text)" }}
            >
              How it works
            </h2>
          </motion.div>

          <div className="flex flex-col gap-16">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, x: i % 2 === 0 ? -44 : 44 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ type: "spring" as const, stiffness: 75, damping: 20 }}
                className={`flex items-stretch gap-10 ${i % 2 !== 0 ? "flex-row-reverse" : ""}`}
              >
                {/* Number column */}
                <div className="shrink-0 w-16 flex items-start justify-center pt-3">
                  <span
                    className="font-display font-bold leading-none select-none"
                    style={{
                      fontSize: "5.5rem",
                      color: "var(--color-gold)",
                      opacity: 0.18,
                    }}
                  >
                    {step.n}
                  </span>
                </div>

                {/* Card */}
                <div
                  className="flex-1 rounded-2xl p-8"
                  style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <h3
                    className="font-display text-2xl mb-3"
                    style={{ color: "var(--color-text)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-[14.5px] font-sans leading-[1.75]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI TEAM ── horizontal overflow strip */}
      <section
        className="py-28 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="max-w-5xl mx-auto px-10 mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring" as const, stiffness: 80, damping: 20 }}
          >
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.22em] text-gold mb-3">
              Specialist Team
            </p>
            <h2
              className="font-display tracking-tight max-w-sm"
              style={{
                fontSize: "clamp(1.9rem,3.2vw,2.8rem)",
                color: "var(--color-text)",
              }}
            >
              Seven agents, one verdict.
            </h2>
          </motion.div>
        </div>

        {/* Scrollable strip with fade edges */}
        <div className="relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, var(--color-bg) 0%, transparent 100%)`,
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
            style={{
              background: `linear-gradient(-90deg, var(--color-bg) 0%, transparent 100%)`,
            }}
          />

          <div
            className="flex gap-4 overflow-x-auto px-10 pb-3"
            style={{ scrollbarWidth: "none" }}
          >
            {AGENTS.map((agent, i) => {
              const Icon = agent.icon;
              return (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    type: "spring" as const,
                    stiffness: 90,
                    damping: 20,
                    delay: i * 0.07,
                  }}
                  whileHover={{
                    y: -5,
                    transition: { type: "spring" as const, stiffness: 220, damping: 18 },
                  }}
                  className="shrink-0 w-48 rounded-2xl p-6 flex flex-col gap-4 group cursor-default"
                  style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: "rgba(201,168,76,0.07)",
                        border: "1px solid rgba(201,168,76,0.18)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <Icon
                        size={17}
                        className="text-gold opacity-70 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <span
                      className="font-display font-bold leading-none select-none"
                      style={{ fontSize: "1.8rem", color: "var(--color-gold)", opacity: 0.14 }}
                    >
                      {agent.n}
                    </span>
                  </div>

                  <div>
                    <p
                      className="text-[12.5px] font-sans font-semibold leading-tight mb-1.5"
                      style={{ color: "var(--color-text)" }}
                    >
                      {agent.name}
                    </p>
                    <p
                      className="text-[11px] font-sans leading-relaxed"
                      style={{ color: "var(--color-text-dim)" }}
                    >
                      {agent.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-10 px-10 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p
            className="text-[11px] font-sans"
            style={{ color: "var(--color-text-dim)" }}
          >
            FilmIQ — AI Film Acquisition Intelligence
          </p>
          <p
            className="text-[11px] font-sans"
            style={{ color: "var(--color-text-dim)" }}
          >
            Powered by Claude · CrewAI
          </p>
        </div>
      </footer>
    </div>
  );
}
