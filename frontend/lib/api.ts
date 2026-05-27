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

export interface ScenarioRequest {
  question: string;
  report_json: unknown;
  film_title: string;
}

export interface ScenarioResponse {
  answer: string;
}

export async function askScenario(req: ScenarioRequest): Promise<ScenarioResponse> {
  const res = await fetch(`${API_BASE}/api/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error((err as { detail?: string }).detail ?? "Scenario request failed");
  }

  return res.json() as Promise<ScenarioResponse>;
}
