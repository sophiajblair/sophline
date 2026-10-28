import { env } from "./env.js";
import { HttpError } from "./http.js";

/** Minimal GitHub REST client. Needs a fine-grained token with Contents (read/write), Actions (read) and Commit statuses (read). */

async function gh<T>(method: string, path: string, body?: unknown, { allow404 = false } = {}): Promise<T> {
  const response = await fetch(`${env.githubApi}/repos/${env.repo}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.githubToken}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "sophline-admin",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (allow404 && response.status === 404) return null as T;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`admin: GitHub ${method} ${path} → ${response.status} ${text.slice(0, 300)}`);
    if (response.status === 401 || response.status === 403) {
      throw new HttpError(502, "github_auth", "GitHub rejected the token. check GITHUB_TOKEN and its permissions.");
    }
    if (response.status === 409 || response.status === 422) {
      throw new HttpError(409, "github_conflict", "GitHub refused the update, probably because main changed. refresh and try again.");
    }
    throw new HttpError(502, "github_error", `GitHub returned ${response.status}.`);
  }
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export type TreeEntry = { path: string; mode: string; type: "blob" | "tree" | "commit"; sha: string; size?: number };
export type Commit = { sha: string; message: string; tree: string; parents: string[]; date: string };

export async function headSha(branch = env.branch): Promise<string> {
  const ref = await gh<{ object: { sha: string } }>("GET", `/git/ref/heads/${branch}`);
  return ref.object.sha;
}

export async function branchSha(branch: string): Promise<string | null> {
  const ref = await gh<{ object: { sha: string } } | null>("GET", `/git/ref/heads/${branch}`, undefined, { allow404: true });
  return ref?.object.sha ?? null;
}

export async function getCommit(sha: string): Promise<Commit> {
  const c = await gh<{ sha: string; message: string; tree: { sha: string }; parents: { sha: string }[]; committer: { date: string } }>(
    "GET",
    `/git/commits/${sha}`,
  );
  return { sha: c.sha, message: c.message, tree: c.tree.sha, parents: c.parents.map((p) => p.sha), date: c.committer.date };
}

export async function getTree(treeSha: string): Promise<Map<string, TreeEntry>> {
  const tree = await gh<{ tree: TreeEntry[]; truncated: boolean }>("GET", `/git/trees/${treeSha}?recursive=1`);
  if (tree.truncated) throw new HttpError(502, "github_error", "repository tree is too large to read.");
  return new Map(tree.tree.filter((entry) => entry.type === "blob").map((entry) => [entry.path, entry]));
}

export async function getBlobText(sha: string): Promise<string> {
  const blob = await gh<{ content: string; encoding: string }>("GET", `/git/blobs/${sha}`);
  return Buffer.from(blob.content, blob.encoding === "base64" ? "base64" : "utf8").toString("utf8");
}

export type TreeChange = { path: string; content?: string; sha?: string | null };

export async function createTree(baseTree: string, changes: TreeChange[]): Promise<string> {
  const tree = changes.map((change) =>
    change.content !== undefined
      ? { path: change.path, mode: "100644", type: "blob", content: change.content }
      : { path: change.path, mode: "100644", type: "blob", sha: change.sha ?? null },
  );
  const result = await gh<{ sha: string }>("POST", "/git/trees", { base_tree: baseTree, tree });
  return result.sha;
}

export async function createCommit(message: string, tree: string, parent: string): Promise<string> {
  const result = await gh<{ sha: string }>("POST", "/git/commits", { message, tree, parents: [parent] });
  return result.sha;
}

export async function createBranch(branch: string, sha: string) {
  await gh("POST", "/git/refs", { ref: `refs/heads/${branch}`, sha });
}

/** Fast-forward only: GitHub rejects the update if `sha` does not descend from the current tip. */
export async function fastForward(branch: string, sha: string) {
  await gh("PATCH", `/git/refs/heads/${branch}`, { sha, force: false });
}

export async function deleteBranch(branch: string) {
  await gh("DELETE", `/git/refs/heads/${branch}`, undefined, { allow404: true });
}

export type ListedCommit = { sha: string; message: string; date: string; url: string };

export async function listCommits(perPage = 50): Promise<ListedCommit[]> {
  const list = await gh<{ sha: string; html_url: string; commit: { message: string; committer: { date: string } } }[]>(
    "GET",
    `/commits?sha=${encodeURIComponent(env.branch)}&per_page=${perPage}`,
  );
  return list.map((c) => ({ sha: c.sha, message: c.commit.message, date: c.commit.committer.date, url: c.html_url }));
}

export type WorkflowRun = { name: string; status: string; conclusion: string | null; html_url: string };

export async function workflowRuns(sha: string): Promise<WorkflowRun[]> {
  const result = await gh<{ workflow_runs: WorkflowRun[] }>("GET", `/actions/runs?head_sha=${sha}&per_page=20`);
  return result.workflow_runs;
}

export type CommitStatus = { context: string; state: string; target_url: string | null; description: string | null };

export async function commitStatuses(sha: string): Promise<CommitStatus[]> {
  const result = await gh<{ statuses: CommitStatus[] }>("GET", `/commits/${sha}/status`);
  return result.statuses;
}

export const commitUrl = (sha: string) => `https://github.com/${env.repo}/commit/${sha}`;

/** Paths whose blob differs between two trees (added, changed or removed). */
export function changedPaths(a: Map<string, TreeEntry>, b: Map<string, TreeEntry>): string[] {
  const paths = new Set([...a.keys(), ...b.keys()]);
  return [...paths].filter((path) => a.get(path)?.sha !== b.get(path)?.sha).sort();
}
