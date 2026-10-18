import { fairPosition } from "@/lib/report";

interface BidScaleProps {
  low: string | null;
  fair: string | null;
  walkAway: string | null;
  size?: "md" | "lg";
}

// Low at the left end, walk-away at the right, fair value placed by amount.
// data-scale-* attributes are the targets of the verdict reveal (useVerdict).
export function BidScale({ low, fair, walkAway, size = "lg" }: BidScaleProps) {
  const pos = `${(fairPosition(low, fair, walkAway) * 100).toFixed(1)}%`;
  const dash = "—";

  return (
    <div
      data-scale
      role="img"
      aria-label={`Bid range: opening bid ${low ?? "not given"}, fair value ${fair ?? "not given"}, walk away above ${walkAway ?? "not given"}`}
      className="relative h-[128px] max-w-[880px]"
    >
      <div data-scale-rule className="absolute inset-x-0 top-16 h-[2px] bg-ink origin-left" />
      <div data-scale-end className="absolute left-0 top-14 w-[2px] h-[18px] bg-ink" />
      <div data-scale-end className="absolute right-0 top-14 w-[2px] h-[18px] bg-cherry" />

      <div data-scale-fair className="absolute bottom-16 -translate-x-1/2 text-center" style={{ left: pos }}>
        <span
          className={`mark inline-block font-bold tracking-[-0.03em] leading-[1.1] ${
            size === "lg" ? "text-31 sm:text-39" : "text-31"
          }`}
        >
          {fair ?? dash}
        </span>
        <div className="w-[2px] h-[14px] bg-ink mx-auto" />
      </div>

      <p data-scale-label className="hidden sm:block absolute top-[82px] -translate-x-1/2 text-13 text-graphite whitespace-nowrap" style={{ left: pos }}>
        Fair value
      </p>
      <p data-scale-label className="absolute left-0 top-[82px] text-13 whitespace-nowrap">
        <b className={`block font-semibold leading-tight ${size === "lg" ? "text-20 sm:text-25" : "text-20"}`}>{low ?? dash}</b>
        Opening bid
      </p>
      <p data-scale-label className="absolute right-0 top-[82px] text-13 text-right text-cherry whitespace-nowrap">
        <b className={`block font-semibold leading-tight ${size === "lg" ? "text-20 sm:text-25" : "text-20"}`}>{walkAway ?? dash}</b>
        Walk away
      </p>
    </div>
  );
}
