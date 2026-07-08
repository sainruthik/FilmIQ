import { isVerdict, VERDICT_COLOR, VERDICT_TINT } from "@/lib/trade";

interface Props {
  verdict: string | null | undefined;
  /** Solid = filled badge (e.g. poster card corner). Outlined = tinted background + border (e.g. table row). */
  solid?: boolean;
}

export function VerdictBadge({ verdict, solid = false }: Props) {
  const v = isVerdict(verdict) ? verdict : "CAUTION";
  const color = VERDICT_COLOR[v];
  const tint = VERDICT_TINT[v];

  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: solid ? "#fffdf9" : color,
        background: solid ? color : tint,
        border: solid ? "none" : `1px solid ${color}`,
        borderRadius: 4,
        padding: solid ? "3px 8px" : "3px 6px",
        textAlign: "center",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {v}
    </span>
  );
}
