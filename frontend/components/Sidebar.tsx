"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  BookMarked,
  BarChart2,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/evaluations", icon: FolderOpen, label: "Active Evaluations" },
  { href: "/deals", icon: BookMarked, label: "Past Deals" },
  { href: "/benchmarks", icon: BarChart2, label: "Market Benchmarks" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className="flex flex-col h-full w-56 shrink-0 border-r"
      style={{
        background: "var(--color-sidebar)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-4 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center shrink-0"
          style={{
            background: "var(--color-accent)",
          }}
        >
          <Zap size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
            FilmIQ
          </p>
          <p
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--color-text-dim)" }}
          >
            Acquisitions
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
        <p
          className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-dim)" }}
        >
          Workspace
        </p>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors",
                active
                  ? "text-[var(--color-text)] font-medium"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              )}
              style={{
                background: active
                  ? "var(--color-sidebar-active)"
                  : undefined,
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--color-sidebar-hover)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              <Icon
                size={15}
                className={cn(
                  "shrink-0",
                  active ? "text-blue-400" : "text-[var(--color-text-dim)]"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t text-[10px]"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text-dim)",
        }}
      >
        AI-powered by CrewAI · GPT-4o
      </div>
    </aside>
  );
}
