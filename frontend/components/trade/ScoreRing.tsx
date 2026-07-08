interface Props {
  score: number;
  size?: number;
  color?: string;
}

export function ScoreRing({ score, size = 132, color = "#2f7d52" }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 360;
  const inner = size - 26;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        margin: "0 auto",
        background: `conic-gradient(${color} 0deg ${angle}deg, rgba(26,22,15,.08) ${angle}deg 360deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          borderRadius: "50%",
          background: "#fffdf9",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 38, fontWeight: 600, lineHeight: 1 }}>
          {clamped}
        </span>
        <span className="mono-label">DEAL SCORE</span>
      </div>
    </div>
  );
}
