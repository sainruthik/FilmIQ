"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { BidRange } from "@/lib/useAnalysis";

gsap.registerPlugin(useGSAP);

interface BidBarProps {
  title: string;
  bid: BidRange;
  /** Selector for the big bid scale; the bar shows once it scrolls under the nav. */
  trigger: string;
}

// Compact bid range pinned under the nav while reading the report.
// Decorative duplicate of the scale above, so hidden from screen readers.
export function BidBar({ title, bid, trigger }: BidBarProps) {
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger); // in-effect: see SmoothScroll
      ScrollTrigger.create({
        trigger,
        start: "bottom 56px",
        // On from here to the end of the page; off when scrolling back above.
        onEnter: () => bar.current?.classList.add("is-on"),
        onLeaveBack: () => bar.current?.classList.remove("is-on"),
      });
    },
    { dependencies: [trigger] },
  );

  return (
    <div
      ref={bar}
      aria-hidden
      className="print:hidden fixed top-14 inset-x-0 z-20 bg-sheet border-b border-rule -translate-y-full opacity-0 pointer-events-none transition-[transform,opacity] duration-300 [&.is-on]:translate-y-0 [&.is-on]:opacity-100"
    >
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 h-12 flex items-center gap-6 text-13 whitespace-nowrap overflow-x-auto">
        <span className="text-16 font-semibold mr-auto truncate">{title}</span>
        {bid.low && (
          <span>
            Opening <b className="text-16">{bid.low}</b>
          </span>
        )}
        {bid.fair && (
          <span>
            Fair <b className="text-16 mark">{bid.fair}</b>
          </span>
        )}
        {bid.walk_away && (
          <span className="text-cherry">
            Walk away <b className="text-16">{bid.walk_away}</b>
          </span>
        )}
      </div>
    </div>
  );
}
