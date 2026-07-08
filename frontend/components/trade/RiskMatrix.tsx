import type { RiskItem } from "@/lib/trade";

const ORDER = ["low", "med", "high"];

const SEVERITY_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  high: { bg: "rgba(201,79,50,.14)", border: "rgba(201,79,50,.45)", text: "#8f3520" },
  med: { bg: "rgba(169,122,28,.14)", border: "rgba(169,122,28,.4)", text: "#7d5a12" },
  low: { bg: "rgba(47,125,82,.1)", border: "rgba(47,125,82,.3)", text: "#1f5c3a" },
};

export function RiskMatrix({ risks }: { risks: RiskItem[] }) {
  const cells: Record<string, { names: string[]; severity: string }> = {};
  for (const risk of risks) {
    const col = ORDER.indexOf(risk.likelihood);
    const row = 2 - ORDER.indexOf(risk.severity);
    if (col < 0 || row < 0) continue;
    const key = `${row}-${col}`;
    if (!cells[key]) cells[key] = { names: [], severity: risk.severity };
    cells[key].names.push(risk.name);
  }

  const items = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = cells[`${row}-${col}`];
      if (!cell) {
        items.push(
          <div key={`${row}-${col}`} style={{ height: 52, borderRadius: 6, background: "rgba(26,22,15,.04)" }} />
        );
      } else {
        const style = SEVERITY_STYLE[cell.severity] ?? SEVERITY_STYLE.med;
        items.push(
          <div
            key={`${row}-${col}`}
            style={{
              height: 52,
              borderRadius: 6,
              background: style.bg,
              border: `1px solid ${style.border}`,
              padding: "8px 10px",
              fontSize: 11.5,
              fontWeight: 600,
              color: style.text,
            }}
          >
            {cell.names.join(", ")}
          </div>
        );
      }
    }
  }

  if (risks.length === 0) return null;

  return (
    <div className="trade-card" style={{ padding: "18px 20px", marginBottom: 22 }}>
      <div className="flex items-baseline gap-2.5" style={{ marginBottom: 14 }}>
        <span className="mono-label">RISK MATRIX</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#b3aa99" }}>
          SEVERITY ↑ · LIKELIHOOD →
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">{items}</div>
    </div>
  );
}
