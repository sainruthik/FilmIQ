"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import type { AgentInfo } from "@/lib/useAnalysis";

interface Props {
  agents: AgentInfo[];
}

export function AgentTimeline({ agents }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {AGENTS.map((cfg, i) => {
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
                  className="agent-ripple absolute inset-0 rounded-xl pointer-events-none"
                  initial={{ boxShadow: "0 0 0 0px rgb(var(--accent-rgb) / 0.5)" }}
                  animate={{ boxShadow: "0 0 0 8px rgb(var(--accent-rgb) / 0)" }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>

            {/* Icon */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: isRunning
                  ? "rgb(var(--accent-rgb) / 0.15)"
                  : isDone
                  ? "rgb(var(--success-rgb) / 0.1)"
                  : "rgb(var(--fg-rgb) / 0.04)",
                border: isRunning
                  ? "1px solid rgb(var(--accent-rgb) / 0.35)"
                  : isDone
                  ? "1px solid rgb(var(--success-rgb) / 0.25)"
                  : "1px solid rgb(var(--fg-rgb) / 0.07)",
                transition: "all 0.4s ease",
              }}
            >
              <Icon
                size={16}
                className={
                  isRunning
                    ? "text-gold"
                    : isDone
                    ? "text-[color:var(--color-success)]"
                    : "text-[var(--color-text-dim)]"
                }
              />
            </div>

            {/* Name + desc */}
            <div className="w-full">
              <p
                className="text-[11px] font-sans font-semibold leading-tight"
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
                className="text-[12px] font-sans mt-0.5 leading-tight"
                style={{ color: "var(--color-text-dim)" }}
              >
                {cfg.short}
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
                  <CheckCircle2 size={12} className="text-[color:var(--color-success)]" />
                </motion.div>
              ) : isRunning ? (
                <Loader2 size={12} className="text-gold animate-spin" />
              ) : (
                <Circle size={12} className="text-[var(--color-text-dim)]" />
              )}
              <span
                className="text-[11px] font-sans"
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
