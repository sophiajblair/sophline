import { env } from "./env.js";
import { commitStatuses, workflowRuns } from "./github.js";

export const CHECK_WORKFLOW = "admin build check";

export type Stage = { state: "pending" | "success" | "failure" | "missing"; url: string | null; detail: string };

/** The GitHub Action that lints and builds an admin preview branch before it may reach main. */
export async function buildCheck(sha: string): Promise<Stage> {
  const runs = (await workflowRuns(sha)).filter((run) => run.name === CHECK_WORKFLOW);
  const run = runs[0];
  if (!run) return { state: "missing", url: null, detail: "no build check has started yet." };
  if (run.status !== "completed") return { state: "pending", url: run.html_url, detail: `build check ${run.status.replace("_", " ")}.` };
  if (run.conclusion === "success") return { state: "success", url: run.html_url, detail: "lint and build passed." };
  return { state: "failure", url: run.html_url, detail: `build check ${run.conclusion ?? "failed"}.` };
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
