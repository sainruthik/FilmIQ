import {
  BarChart3,
  DollarSign,
  FileText,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface Agent {
  name: string;
  icon: LucideIcon;
  /** Landing-page card copy. */
  desc: string;
  /** Narrow timeline card copy. */
  short: string;
}

// Pipeline order: six specialists, then the strategist. Names must match the
// backend's `key.replace("_", " ").title()` in agent_done events.
export const AGENTS: Agent[] = [
  { name: "Document Analyst", icon: FileText, desc: "Story · Genre · Budget · Rights", short: "Story · Genre · Budget" },
  { name: "Talent Researcher", icon: Users, desc: "Director track record · Cast value", short: "Director · Cast value" },
  { name: "Market Analyst", icon: BarChart3, desc: "Streaming benchmarks · Comparables", short: "Streaming benchmarks" },
  { name: "Deals Researcher", icon: DollarSign, desc: "Acquisition deals · Pricing anchors", short: "Comparable deals" },
  { name: "Buzz Analyst", icon: TrendingUp, desc: "Festival buzz · Critic sentiment", short: "Festival · Critics" },
  { name: "Risk Analyst", icon: ShieldAlert, desc: "Red flags · Risk register", short: "Red flags · Risk register" },
  { name: "Acquisitions Strategist", icon: Target, desc: "Bid range · Final recommendation", short: "Bid range · Final report" },
];

export const SPECIALIST_NAMES = AGENTS.slice(0, -1).map((a) => a.name);
export const STRATEGIST_NAME = AGENTS[AGENTS.length - 1].name;
