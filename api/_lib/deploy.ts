import { env } from "./env.js";
import { commitStatuses, jobLog, runJobs, workflowRuns } from "./github.js";

export const CHECK_WORKFLOW = "admin build check";
const MAX_ERRORS = 40;
const MAX_ERROR_CHARS = 700;

export type Stage = { state: "pending" | "success" | "failure" | "missing"; url: string | null; detail: string; errors?: string[] };

/**
 * Error lines from a build check log. scripts/admin-check.mjs prints one `ADMIN_CHECK_ERROR` line per
 * problem; if it never ran (e.g. npm ci failed) the last lines before the failure are used instead.
 */
export function parseCheckLog(log: string): string[] {
  const lines = log
    .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z ?/, "").replace(/^##\[(error|warning)\]/, ""));
  const clip = (line: string) => (line.length > MAX_ERROR_CHARS ? `${line.slice(0, MAX_ERROR_CHARS - 1)}…` : line);
  const tagged = lines.filter((line) => line.startsWith("ADMIN_CHECK_ERROR ")).map((line) => clip(line.slice("ADMIN_CHECK_ERROR ".length).trim()));
  if (tagged.length) return tagged.slice(0, MAX_ERRORS);

  const plain: string[] = [];
  let file = "";
  lines.forEach((line, index) => {
    const header = line.match(/^\/home\/runner\/work\/[^/]+\/[^/]+\/(\S+\.(?:tsx?|jsx?|mjs))$/);
    if (header) file = header[1];
    const lint = line.match(/^\s*(\d+):(\d+)\s+error\s+(.+)$/);
    if (lint && file) plain.push(`${file}:${lint[1]}:${lint[2]} ${lint[3].trim()}`);
    if (/\(\d+,\d+\): error TS\d+/.test(line)) {
      const next = lines[index + 1] ?? "";
      plain.push(/^\s+\S/.test(next) ? `${line.trim()} — ${next.trim()}` : line.trim());
    }
  });
  if (plain.length) return plain.slice(0, MAX_ERRORS).map(clip);

  const end = lines.findIndex((line) => line.startsWith("Process completed with exit code"));
  const stop = end === -1 ? lines.length : end;
  return lines
    .slice(Math.max(0, stop - 12), stop)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("##[") && !line.startsWith("::"))
    .map(clip);
}

async function failureErrors(runId: number): Promise<string[]> {
  try {
    const jobs = await runJobs(runId);
    const failed = jobs.find((job) => job.conclusion === "failure") ?? jobs[0];
    if (!failed) return [];
    return parseCheckLog(await jobLog(failed.id));
  } catch (error) {
    console.error("admin: could not read build log", error);
    return [];
  }
}

/** The GitHub Action that lints, typechecks and builds an admin preview branch before it may reach main. */
export async function buildCheck(sha: string, { withErrors = true } = {}): Promise<Stage> {
  const runs = (await workflowRuns(sha)).filter((run) => run.name === CHECK_WORKFLOW);
  const run = runs[0];
  if (!run) return { state: "missing", url: null, detail: "no build check has started yet." };
  if (run.status !== "completed") return { state: "pending", url: run.html_url, detail: `build check ${run.status.replace("_", " ")}.` };
  if (run.conclusion === "success") return { state: "success", url: run.html_url, detail: "lint, typecheck and build passed." };
  const errors = withErrors ? await failureErrors(run.id) : [];
  const detail = errors.length
    ? `build check failed with ${errors.length} error${errors.length === 1 ? "" : "s"}.`
    : `build check ${run.conclusion ?? "failed"}; open the details link for the log.`;
  return { state: "failure", url: run.html_url, detail, errors };
}

type VercelDeployment = { uid: string; url: string; readyState?: string; state?: string; target?: string | null; meta?: Record<string, string> };

async function fromVercelApi(sha: string): Promise<Stage | null> {
  if (!env.vercelToken || !env.vercelProjectId) return null;
  const query = new URLSearchParams({ projectId: env.vercelProjectId, limit: "20" });
  if (env.vercelTeamId) query.set("teamId", env.vercelTeamId);
  const response = await fetch(`https://api.vercel.com/v6/deployments?${query}`, { headers: { authorization: `Bearer ${env.vercelToken}` } });
  if (!response.ok) {
    console.error("admin: Vercel API", response.status);
    return null;
  }
  const { deployments } = (await response.json()) as { deployments: VercelDeployment[] };
  const match = deployments.find((d) => d.meta?.githubCommitSha === sha);
  if (!match) return { state: "pending", url: null, detail: "waiting for Vercel to start the deployment." };
  const ready = match.readyState ?? match.state ?? "";
  const url = `https://${match.url}`;
  if (ready === "READY") return { state: "success", url, detail: "deployed by Vercel." };
  if (ready === "ERROR" || ready === "CANCELED") return { state: "failure", url, detail: `Vercel deployment ${ready.toLowerCase()}. the previous version stays live.` };
  return { state: "pending", url, detail: `Vercel is ${ready.toLowerCase() || "building"}.` };
}

/** Vercel's status for a commit on main: from the Vercel API when VERCEL_TOKEN is set, otherwise the GitHub commit status Vercel posts. */
export async function deployStatus(sha: string): Promise<Stage> {
  const api = await fromVercelApi(sha).catch(() => null);
  if (api) return api;
  const status = (await commitStatuses(sha)).find((s) => s.context.toLowerCase().startsWith("vercel"));
  if (!status) return { state: "pending", url: null, detail: "waiting for Vercel to report." };
  if (status.state === "success") return { state: "success", url: status.target_url, detail: "deployed by Vercel." };
  if (status.state === "failure" || status.state === "error")
    return { state: "failure", url: status.target_url, detail: "Vercel build failed. the previous version stays live." };
  return { state: "pending", url: status.target_url, detail: status.description ?? "Vercel is building." };
}
