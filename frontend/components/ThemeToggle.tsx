"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "screening", label: "Screening" },
];

// Two-option switch: the filled segment is the current theme.
export function ThemeToggle() {
  // null until mounted: the server can't know the saved theme.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "screening" ? "screening" : "draft");
  }, []);

  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / blocked storage: theme still switches for this visit.
    }
    // Lets the fog (Haze) recolour without a shared store.
    window.dispatchEvent(new Event("filmiq-theme"));
    setTheme(next);
  }

  return (
    <div role="group" aria-label="Theme" className="inline-flex border border-rule rounded">
      {OPTIONS.map(({ value, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            disabled={theme === null}
            aria-pressed={active}
            className={`min-h-[36px] px-3 text-13 font-medium transition-colors ${
              active ? "bg-ink text-paper" : "text-graphite hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
