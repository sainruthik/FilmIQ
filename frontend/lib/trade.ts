export type Verdict = "PURSUE" | "CAUTION" | "PASS";

export const VERDICT_COLOR: Record<Verdict, string> = {
  PURSUE: "#2f7d52",
  CAUTION: "#a97a1c",
  PASS: "#c94f32",
};

export const VERDICT_TINT: Record<Verdict, string> = {
  PURSUE: "rgba(47,125,82,.1)",
  CAUTION: "rgba(169,122,28,.1)",
  PASS: "rgba(201,79,50,.1)",
};

export function isVerdict(value: unknown): value is Verdict {
  return value === "PURSUE" || value === "CAUTION" || value === "PASS";
}

export function verdictColor(verdict: string | null | undefined): string {
  return isVerdict(verdict) ? VERDICT_COLOR[verdict] : VERDICT_COLOR.CAUTION;
}

/** "$0.85M" / "$500K" / "$1.2B" -> 850000 / 500000 / 1200000000. Unparseable input -> 0. */
export function parseMoney(value: string | null | undefined): number {
  if (!value) return 0;
  const m = value.replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  if (Number.isNaN(num)) return 0;
  const suffix = (m[2] ?? "").toUpperCase();
  const mult = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : suffix === "B" ? 1_000_000_000 : 1;
  return num * mult;
}

/** Shared dollar scale so every bar in a list/table compares visually. */
export function sharedScaleMax(walkAways: Array<string | null | undefined>): number {
  const values = walkAways.map(parseMoney);
  return Math.max(...values, 1);
}

export interface Source {
  type: "pdf" | "web";
  label: string;
}

export interface RiskItem {
  name: string;
  severity: "low" | "med" | "high";
  likelihood: "low" | "med" | "high";
}

export interface ComparableDeal {
  title: string;
  buyer: string;
  year: string;
  price: string;
}
