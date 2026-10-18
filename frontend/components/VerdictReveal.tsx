"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface VerdictRevealProps {
  children: React.ReactNode;
  /** Seconds to wait, e.g. while the fog clears. */
  delay?: number;
}

// The star moment: the bid scale draws left to right, fair value drops onto
// it, labels settle. Plays once on mount. Targets are BidScale's data-scale-*
// attributes. Reduced motion: no tween, the final state is the markup.
export function VerdictReveal({ children, delay = 0 }: VerdictRevealProps) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ delay, defaults: { ease: "power3.out" } })
          .from("[data-scale-rule]", { scaleX: 0, duration: 0.7 })
          .from("[data-scale-end]", { opacity: 0, duration: 0.2 }, "-=0.2")
          .from("[data-scale-fair]", { opacity: 0, y: -24, duration: 0.6, ease: "back.out(1.6)" })
          .from("[data-scale-label]", { opacity: 0, duration: 0.3, stagger: 0.06 }, "-=0.2");
      });
      return () => mm.revert();
    },
    { scope },
  );

  return <div ref={scope}>{children}</div>;
}
