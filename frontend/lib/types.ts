export interface ComparableDeal {
  title: string;
  price: string;
  buyer: string;
  festival: string;
  url: string;
}

export interface RiskFlag {
  risk: string;
  severity: "High" | "Medium" | "Low";
  mitigation: string;
}

export interface BidRange {
  low: string;
  fair: string;
  walkAway: string;
  justification: string;
}

export interface FestivalBuzz {
  sentimentScore: number;
  summary: string;
}

export interface AcquisitionReport {
  filmTitle: string;
  bidRange: BidRange;
  executiveSummary: string;
  comparableDeals: ComparableDeal[];
  riskFlags: RiskFlag[];
  festivalBuzz: FestivalBuzz;
}
