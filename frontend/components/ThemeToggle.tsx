"use client";

import { useEffect, useState } from "react";
import { FileText, Terminal } from "lucide-react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "memo" | "terminal";

const OPTIONS: { value: Theme; label: string; Icon: typeof FileText }[] = [
  { value: "memo", label: "Memo", Icon: FileText },
  { value: "terminal", label: "Terminal", Icon: Terminal },
];

// Two-option switch: the filled segment is the current theme, so the label
// never reads as the mode you're already in.
export function ThemeToggle() {
  // null until mounted: the server can't know the saved theme.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "terminal" ? "terminal" : "memo");
  }, []);

  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / blocked storage: theme still switches for this visit.
    }
    setTheme(next);
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-stretch p-1 rounded-full"
      style={{ border: "1px solid var(--color-border-accent)" }}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            disabled={theme === null}
            aria-pressed={active}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full text-[11px] font-sans font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              color: active ? "var(--color-on-accent)" : "var(--color-text-muted)",
              background: active ? "var(--color-gold)" : "transparent",
              outlineColor: "var(--color-gold)",
            }}
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
