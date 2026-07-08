import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  /** Mono uppercase label shown next to the logo, e.g. "DEAL ROOM" or "ANALYZING". */
  sectionLabel?: string;
  /** Right-aligned content — buttons, status pills, search, etc. */
  children?: ReactNode;
}

export function NavBar({ sectionLabel, children }: Props) {
  return (
    <nav
      className="flex items-center gap-4 border-b sticky top-0 z-50"
      style={{ padding: "14px 32px", borderColor: "var(--color-border)", background: "#fffdf9" }}
    >
      <Link href="/" className="font-display italic" style={{ fontSize: 23, color: "#1a160f" }}>
        FilmIQ
      </Link>
      {sectionLabel && <span className="mono-label">{sectionLabel}</span>}
      <div className="flex-1" />
      {children}
    </nav>
  );
}
