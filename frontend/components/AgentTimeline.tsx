"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Target,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import type { AgentInfo } from "@/lib/useAnalysis";

const AGENT_CONFIG = [
  { name: "Document Analyst", icon: FileText, description: "Story · Genre · Budget" },
  { name: "Talent Researcher", icon: Users, description: "Director · Cast value" },
  { name: "Market Analyst", icon: BarChart3, description: "Streaming benchmarks" },
  { name: "Deals Researcher", icon: DollarSign, description: "Comparable deals" },
  { name: "Buzz Analyst", icon: TrendingUp, description: "Festival · Critics" },
  { name: "Risk Analyst", icon: ShieldAlert, description: "Red flags · Risk register" },
  { name: "Acquisitions Strategist", icon: Target, description: "Bid range · Final report" },
];

interface Props {
  agents: AgentInfo[];
}

export function AgentTimeline({ agents }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {AGENT_CONFIG.map((cfg, i) => {
        const agent = agents[i] ?? { name: cfg.name, status: "waiting" };
        const Icon = cfg.icon;
        const isRunning = agent.status === "running";
        const isDone = agent.status === "done";

        return (
          <motion.div
            key={cfg.name}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring" as const,
              stiffness: 100,
              damping: 20,
              delay: i * 0.08,
            }}
            className={`relative rounded-xl p-3 flex flex-col items-center gap-2.5 text-center overflow-hidden ${
              isRunning ? "agent-card-running" : isDone ? "agent-card-done" : "agent-card-waiting"
            }`}
          >
            {/* Ripple ring on running */}
            <AnimatePresence>
              {isRunning && (
                <motion.div
                  key="ripple"
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  initial={{ boxShadow: "0 0 0 0px rgba(201,168,76,0.5)" }}
                  animate={{ boxShadow: "0 0 0 8px rgba(201,168,76,0)" }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>

            {/* Icon */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: isRunning
                  ? "rgba(201,168,76,0.15)"
                  : isDone
                  ? "rgba(74,222,128,0.1)"
                  : "rgba(255,255,255,0.04)",
                border: isRunning
                  ? "1px solid rgba(201,168,76,0.35)"
                  : isDone
                  ? "1px solid rgba(74,222,128,0.25)"
                  : "1px solid rgba(255,255,255,0.07)",
                transition: "all 0.4s ease",
              }}
            >
              <Icon
                size={16}
                className={
                  isRunning
                    ? "text-gold"
                    : isDone
                    ? "text-green-400"
                    : "text-[var(--color-text-dim)]"
                }
              />
            </div>

            {/* Name + desc */}
            <div className="w-full">
              <p
                className="text-[10px] font-sans font-semibold leading-tight"
                style={{
                  color: isRunning
                    ? "var(--color-gold)"
                    : isDone
                    ? "var(--color-success)"
                    : "var(--color-text-muted)",
                }}
              >
                {cfg.name}
              </p>
              <p
                className="text-[9px] font-sans mt-0.5 leading-tight"
                style={{ color: "var(--color-text-dim)" }}
              >
                {cfg.description}
              </p>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-1">
              {isDone ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring" as const, stiffness: 250, damping: 20 }}
                >
                  <CheckCircle2 size={12} className="text-green-400" />
                </motion.div>
              ) : isRunning ? (
                <Loader2 size={12} className="text-gold animate-spin" />
              ) : (
                <Circle size={12} className="text-[var(--color-text-dim)]" />
              )}
              <span
                className="text-[9px] font-sans"
                style={{
                  color: isRunning
                    ? "var(--color-gold)"
                    : isDone
                    ? "var(--color-success)"
                    : "var(--color-text-dim)",
                }}
              >
                {isRunning ? "Working…" : isDone ? "Done" : "Waiting"}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
