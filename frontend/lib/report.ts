// Display helpers for the report. No business logic: values come from the
// backend as strings ("$2M", "$750K", "$2,400,000") and stay strings.

const MULTIPLIER: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/** "$2.6M" -> 2600000. Null when the string isn't a single amount. */
export function parseMoney(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/^\s*[>~]?\s*\$?\s*(\d+(?:\.\d+)?)\s*([kmb])?\s*$/i);
  if (!match) return null;
  return Math.round(Number(match[1]) * (MULTIPLIER[match[2]?.toLowerCase() ?? ""] ?? 1));
}

/** Where fair value sits between low (0) and walk-away (1); 0.5 when unknown. */
export function fairPosition(low: string | null, fair: string | null, walkAway: string | null): number {
  const [l, f, w] = [parseMoney(low), parseMoney(fair), parseMoney(walkAway)];
  if (l === null || f === null || w === null || w <= l) return 0.5;
  // Keep the marker's label clear of the end labels.
  return Math.min(0.85, Math.max(0.15, (f - l) / (w - l)));
}

// Same pattern as backend/pipeline/verifier.py, minus anything that is
// already a markdown link: [PDF p.3], [PDF pp.3-4], [PDF p.3, p.5].
const PDF_CITE = /\[(PDF pp?\.\s?\d+[^\]]*)\](?!\()/g;
const UNVERIFIED = /\[unverified\](?!\()/gi;

/** Turn citation tags into inline code so the renderer can style them. */
export function tagCitations(markdown: string): string {
  return markdown.replace(PDF_CITE, "`$1`").replace(UNVERIFIED, "`unverified`");
}

export type CitationKind = "pdf" | "unverified" | null;

export function citationKind(text: string): CitationKind {
  if (/^PDF pp?\./.test(text)) return "pdf";
  if (text.toLowerCase() === "unverified") return "unverified";
  return null;
}

/** Slug for report heading anchors (contents sidebar). */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Level-2 headings in report order, for the contents sidebar. */
export function reportHeadings(markdown: string): { id: string; text: string }[] {
  return [...markdown.matchAll(/^##\s+(.+?)\s*#*\s*$/gm)].map(([, text]) => {
    const clean = text.replace(/[*_`]/g, "");
    return { id: slugify(clean), text: clean };
  });
}
