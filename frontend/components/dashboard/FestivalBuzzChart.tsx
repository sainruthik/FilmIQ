"use client";

import dynamic from "next/dynamic";
import type { FestivalBuzz } from "@/lib/types";

const RadialBarChart = dynamic(
  () => import("recharts").then((m) => m.RadialBarChart),
  { ssr: false }
);
const RadialBar = dynamic(
  () => import("recharts").then((m) => m.RadialBar),
  { ssr: false }
);
const PolarAngleAxis = dynamic(
  () => import("recharts").then((m) => m.PolarAngleAxis),
  { ssr: false }
);

interface FestivalBuzzChartProps {
  buzz: FestivalBuzz;
}

function scoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Positive";
  if (score >= 40) return "Mixed";
  if (score >= 20) return "Negative";
  return "Poor";
}

export function FestivalBuzzChart({ buzz }: FestivalBuzzChartProps) {
  const score = Math.min(100, Math.max(0, buzz.sentimentScore ?? 0));
  const color = scoreColor(score);
  const data = [{ value: score, fill: color }];

  return (
    <div
      className="rounded-lg p-4 h-full flex flex-col"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border-strong)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--color-text-dim)" }}
      >
        Festival & Critic Buzz
      </p>

      <div className="flex items-center gap-5 flex-1">
        {/* Gauge */}
        <div className="relative shrink-0 w-28 h-28">
          <RadialBarChart
            width={112}
            height={112}
            cx={56}
            cy={56}
            innerRadius={36}
            outerRadius={52}
            barSize={10}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: "var(--color-surface-raised)" }}
              dataKey="value"
              cornerRadius={6}
              angleAxisId={0}
            />
          </RadialBarChart>
          {/* Centre text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className="text-2xl font-bold tabular-nums leading-none"
              style={{ color }}
            >
              {score}
            </span>
            <span
              className="text-[10px] font-medium mt-0.5"
              style={{ color: "var(--color-text-dim)" }}
            >
              / 100
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold mb-1"
            style={{ color }}
          >
            {scoreLabel(score)} Buzz
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            {buzz.summary || "No buzz data available."}
          </p>
        </div>
      </div>
    </div>
  );
}
