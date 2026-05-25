"use client";

import Link from "next/link";
import { Film } from "lucide-react";
import { motion } from "framer-motion";

export function NavBar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring" as const, stiffness: 120, damping: 22, delay: 0.02 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border)]"
      style={{ background: "rgba(7,7,7,0.92)", backdropFilter: "blur(20px)" }}
    >
      {/* Film-strip perforation bar */}
      <div
        className="h-[3px] w-full"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0, transparent 9px, rgba(201,168,76,0.38) 9px, rgba(201,168,76,0.38) 13px)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 0.4, type: "tween" as const }}
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.32)",
            }}
          >
            <Film size={13} className="text-gold" />
          </motion.div>
          <span className="font-display font-semibold text-[15px] tracking-wide gold-text">
            FilmIQ
          </span>
        </Link>

        <span
          className="text-[9.5px] font-sans uppercase tracking-[0.14em] px-3 py-1 rounded-full"
          style={{
            color: "var(--color-text-dim)",
            border: "1px solid var(--color-border)",
          }}
        >
          AI Acquisition Intelligence
        </span>
      </div>
    </motion.nav>
  );
}
