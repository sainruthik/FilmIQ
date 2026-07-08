import { parseMoney, verdictColor } from "@/lib/trade";

interface Props {
  low: string | null | undefined;
  fair: string | null | undefined;
  walkAway: string | null | undefined;
  verdict: string | null | undefined;
  /** Shared dollar scale across the list/table this bar belongs to — compute
   * once with sharedScaleMax() and pass the same value to every bar. */
  scaleMax: number;
  height?: number;
  showLabels?: boolean;
}

export function BidRangeBar({ low, fair, walkAway, verdict, scaleMax, height = 6, showLabels = true }: Props) {
  const color = verdictColor(verdict);
  const max = scaleMax > 0 ? scaleMax : 1;

  const lowPct = Math.min(100, (parseMoney(low) / max) * 100);
  const fairPct = Math.min(100, (parseMoney(fair) / max) * 100);
  const walkPct = Math.min(100, (parseMoney(walkAway) / max) * 100);
  const widthPct = Math.max(0, walkPct - lowPct);

  return (
    <div>
      <div
        style={{
          position: "relative",
          height,
          background: "rgba(26,22,15,.08)",
          borderRadius: 999,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${lowPct}%`,
            width: `${widthPct}%`,
            borderRadius: 999,
            background: color,
            opacity: 0.75,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -3,
            bottom: -3,
            width: 2,
            background: "#1a160f",
            left: `${fairPct}%`,
          }}
        />
      </div>
      {showLabels && (
        <div
          className="flex justify-between mt-1"
          style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#837b6c" }}
        >
          <span>{low ?? "—"}</span>
          <span>fair {fair ?? "—"}</span>
          <span>{walkAway ?? "—"}</span>
        </div>
      )}
    </div>
  );
}
