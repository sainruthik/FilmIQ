export interface Agent {
  name: string;
  /** Report section the agent writes (landing contents list). */
  section: string;
  /** Landing contents-list copy. */
  desc: string;
  /** Analysis-page row copy. */
  short: string;
}

// Pipeline order: six specialists, then the strategist. Names must match the
// backend's `key.replace("_", " ").title()` in agent_done events.
export const AGENTS: Agent[] = [
  { name: "Document Analyst", section: "Story and rights", desc: "Logline, genre, budget, and which rights are actually for sale.", short: "Story, genre, budget, rights" },
  { name: "Talent Researcher", section: "Director and cast", desc: "Track records and what each name adds to the price.", short: "Director and cast value" },
  { name: "Market Analyst", section: "Market comparables", desc: "How similar films performed on streaming.", short: "Streaming comparables" },
  { name: "Deals Researcher", section: "Comparable deals", desc: "What buyers paid for similar films, with sources.", short: "Priced acquisition deals" },
  { name: "Buzz Analyst", section: "Festival and critics", desc: "Premiere, reviews, and awards attention.", short: "Festival and critics" },
  { name: "Risk Analyst", section: "Risk register", desc: "Chain-of-title gaps, talent issues, delivery risk.", short: "Red flags and risk register" },
  { name: "Acquisitions Strategist", section: "Bid recommendation", desc: "Opening bid, fair value and walk-away, tied to a rights package.", short: "Bid range and final report" },
];

export const SPECIALIST_NAMES = AGENTS.slice(0, -1).map((a) => a.name);
export const STRATEGIST_NAME = AGENTS[AGENTS.length - 1].name;
