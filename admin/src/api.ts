export type SessionInfo = {
  configured: boolean;
  authenticated: boolean;
  missing?: string[];
  csrf?: string;
  expiresAt?: number;
  canChange?: boolean;
  model?: string;
  repo?: string;
  branch?: string;
  rateLimitStore?: "redis" | "memory";
  vercelApi?: boolean;
};

export type ProposedFile = { path: string; status: "added" | "modified" | "deleted"; diff: string };

/** A proposed change, already committed to a preview branch for the build check. `token` is null when Claude proposed nothing. */
export type Proposal = {
  token: string | null;
  baseSha: string;
  sha?: string;
  branch?: string;
  commitUrl?: string;
  /** automatic build fixes so far, and how many are allowed */
  attempt?: number;
  maxFixes?: number;
  fixes?: string[];
  fixedErrors?: string[];
  summary: string;
  notes: string;
  commitMessage: string;
  model: string;
  warnings: string[];
  files: ProposedFile[];
};

export type Stage = { state: "pending" | "success" | "failure" | "missing"; url: string | null; detail: string; errors?: string[]; commitUrl?: string };

export type HistoryItem = { sha: string; title: string; date: string; url: string; kind: "admin" | "undo"; reverted: boolean };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public errors: string[] = [],
  ) {
    super(message);
  }
}

let csrf = "";
export const setCsrf = (token: string | undefined) => {
  csrf = token ?? "";
};

export async function api<T>(action: string, body?: unknown, query = ""): Promise<T> {
  const response = await fetch(`/api/admin/${action}${query}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "content-type": "application/json", "x-csrf-token": csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ error: "bad_response", message: `the server returned ${response.status}.` }));
  if (!response.ok) throw new ApiError(response.status, data.error ?? "error", data.message ?? "request failed.", data.errors ?? []);
  return data as T;
}
