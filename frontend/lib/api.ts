const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = (jobId: string) => `filmiq_token_${jobId}`;

export interface UploadResult {
  job_id: string;
  filename: string;
  filenames: string[];
  access_token: string;
}

export async function uploadFilms(files: File[]): Promise<UploadResult> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail ?? "Upload failed");
  }

  const result: UploadResult = await res.json();

  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY(result.job_id), result.access_token);
  }

  return result;
}

export function getJobToken(jobId: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY(jobId)) ?? "";
}

export function getAnalysisUrl(jobId: string): string {
  const token = getJobToken(jobId);
  const params = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_BASE}/api/analyze/${jobId}${params}`;
}

export interface ReportSummary {
  id: string;
  title: string;
  genre: string | null;
  director: string | null;
  created_at: number;
  deal_score: number | null;
  verdict: string | null;
  bid_low: string | null;
  bid_fair: string | null;
  bid_walk_away: string | null;
}

export async function listReports(): Promise<ReportSummary[]> {
  const res = await fetch(`${API_BASE}/api/reports`);
  if (!res.ok) throw new Error("Failed to load reports.");
  const data = await res.json();
  return data.reports as ReportSummary[];
}

export async function getReport(reportId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/reports/${reportId}`);
  if (!res.ok) throw new Error("Report not found.");
  return res.json();
}

export interface CompareResult {
  reports: Record<string, unknown>[];
  verdict: string;
}

export async function compareReports(reportIds: string[]): Promise<CompareResult> {
  const res = await fetch(`${API_BASE}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report_ids: reportIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Compare failed" }));
    throw new Error(err.detail ?? "Compare failed");
  }
  return res.json();
}
