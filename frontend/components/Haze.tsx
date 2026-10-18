"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface VantaEffect {
  destroy: () => void;
}

interface HazeProps {
  /** When it turns false the fog fades out and the WebGL effect is destroyed. */
  active?: boolean;
  className?: string;
}

const FADE_SECONDS = 1.2;

function fogColors(): number[] {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--fog")
    .trim()
    .split(/\s+/)
    .map((hex) => parseInt(hex.slice(1), 16));
}

// Vanta FOG, the haze of the unknown. Desktop (768px+) and full motion only;
// three.js and Vanta load after first paint. Vanta skips rendering by itself
// while the element is off-screen.
export function Haze({ active = true, className = "" }: HazeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const effect = useRef<VantaEffect | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 768) return;

    let cancelled = false;

    async function start() {
      const [THREE, { default: FOG }] = await Promise.all([import("three"), import("vanta/dist/vanta.fog.min")]);
      if (cancelled || !el) return;
      effect.current?.destroy();
      const [baseColor, lowlightColor, midtoneColor, highlightColor] = fogColors();
      effect.current = FOG({
        el,
        THREE,
        baseColor,
        lowlightColor,
        midtoneColor,
        highlightColor,
        blurFactor: 0.75,
        speed: 0.6,
        zoom: 0.7,
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
      });
      gsap.to(el, { opacity: 1, duration: 0.8 });
    }

    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(() => {
      start().catch(() => {
        // WebGL unavailable or chunk failed: the plain page background stands in.
      });
    });
    // Recolour on theme switch.
    const onTheme = () => effect.current && start().catch(() => undefined);
    window.addEventListener("filmiq-theme", onTheme);

    return () => {
      cancelled = true;
      window.removeEventListener("filmiq-theme", onTheme);
      // Verdict: fade the fog, then free the WebGL context.
      const current = effect.current;
      effect.current = null;
      if (current) gsap.to(el, { opacity: 0, duration: FADE_SECONDS, ease: "power2.inOut", onComplete: () => current.destroy() });
    };
  }, [active]);

  return <div ref={ref} aria-hidden className={`absolute inset-0 pointer-events-none opacity-0 print:hidden ${className}`} />;
}
