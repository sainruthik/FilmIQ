import type { ComparableDeal } from "@/lib/trade";

export function ComparablesTable({ deals }: { deals: ComparableDeal[] }) {
  if (deals.length === 0) return null;

  return (
    <div className="trade-card overflow-hidden">
      <div
        className="grid"
        style={{
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          padding: "10px 18px",
          background: "#f2ede2",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span className="mono-label">COMPARABLE</span>
        <span className="mono-label">BUYER</span>
        <span className="mono-label">YEAR</span>
        <span className="mono-label" style={{ textAlign: "right" }}>PRICE</span>
      </div>
      {deals.map((d, i) => (
        <div
          key={`${d.title}-${i}`}
          className="grid"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            padding: "12px 18px",
            borderBottom: i < deals.length - 1 ? "1px solid var(--color-border-row)" : undefined,
            fontSize: 13,
            alignItems: "center",
          }}
        >
          <span className="font-display" style={{ fontSize: 15 }}>{d.title}</span>
          <span style={{ color: "#5c564a" }}>{d.buyer}</span>
          <span style={{ color: "#5c564a" }}>{d.year}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, textAlign: "right" }}>{d.price}</span>
        </div>
      ))}
    </div>
  );
}
