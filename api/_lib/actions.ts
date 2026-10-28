import { askClaude, type RepoFile } from "./claude.js";
import { buildCheck, deployStatus } from "./deploy.js";
import { env, missing } from "./env.js";
import {
  branchSha,
  changedPaths,
  commitUrl,
  createBranch,
  createCommit,
  createTree,
  deleteBranch,
  fastForward,
  getBlobText,
  getCommit,
  getTree,
  headSha,
  listCommits,
} from "./github.js";
import { HttpError, assertSameOrigin, clientIp, errorResponse, json, readJson } from "./http.js";
import { isEditable } from "./policy.js";
import { applyChanges, cleanCommitMessage, diffFor, readProposal, signProposal, warningsFor } from "./proposal.js";
import { assertNotLocked, rateLimitStore, recordFailure, recordSuccess } from "./ratelimit.js";
import { safeEqual } from "./crypto.js";
import { assertConfigured, clearCookie, createSession, readSession, requireSession } from "./session.js";

const SHA = /^[0-9a-f]{40}$/;
const PREVIEW = /^admin\/preview-[0-9a-f]{7}$/;
const MAX_CONTEXT_BYTES = 600_000;

async function session(request: Request) {
  const authGaps = missing("auth");
  if (authGaps.length) return json({ configured: false, authenticated: false, missing: missing("changes") });
  const current = readSession(request);
  if (!current) return json({ configured: true, authenticated: false });
  return json({
    configured: true,
    authenticated: true,
    csrf: current.csrf,
    expiresAt: current.exp,
    canChange: missing("changes").length === 0,
    missing: missing("changes"),
    model: env.model,
    repo: env.repo,
    branch: env.branch,
    rateLimitStore: rateLimitStore(),
    vercelApi: Boolean(env.vercelToken && env.vercelProjectId),
  });
}

async function login(request: Request) {
  assertConfigured("auth");
  assertSameOrigin(request);
  const { password } = await readJson<{ password?: unknown }>(request);
  const ip = clientIp(request);
  await assertNotLocked(ip);
  if (typeof password !== "string" || !safeEqual(password, env.adminPassword ?? "")) {
    await recordFailure(ip);
    const { remaining } = await assertNotLocked(ip).catch(() => ({ remaining: 0 }));
    throw new HttpError(401, "wrong_password", remaining > 0 ? `wrong password. ${remaining} tries left before a 15 minute lockout.` : "wrong password. login is now locked for 15 minutes.");
  }
  await recordSuccess(ip);
  const { cookie, csrf } = createSession();
  return json({ ok: true, csrf }, 200, { "set-cookie": cookie });
}

async function logout(request: Request) {
  assertSameOrigin(request);
  return json({ ok: true }, 200, { "set-cookie": clearCookie });
}

async function readEditableFiles(sha: string): Promise<{ files: RepoFile[]; tree: string }> {
  const commit = await getCommit(sha);
  const tree = await getTree(commit.tree);
  const entries = [...tree.values()].filter((entry) => isEditable(entry.path)).sort((a, b) => a.path.localeCompare(b.path));
  let budget = MAX_CONTEXT_BYTES;
  const chosen = entries.filter((entry) => {
    budget -= entry.size ?? 0;
    return budget >= 0;
  });
  const files = await Promise.all(chosen.map(async (entry) => ({ path: entry.path, content: await getBlobText(entry.sha) })));
  return { files, tree: commit.tree };
}

async function propose(request: Request) {
  requireSession(request, { mutating: true });
  assertConfigured("changes");
  const { prompt } = await readJson<{ prompt?: unknown }>(request);
  if (typeof prompt !== "string" || prompt.trim().length < 3) throw new HttpError(400, "bad_request", "describe the change you want.");
  if (prompt.length > 4000) throw new HttpError(400, "bad_request", "keep the request under 4000 characters.");
  const baseSha = await headSha();
  const { files } = await readEditableFiles(baseSha);
  const current = new Map(files.map((file) => [file.path, file.content]));

  let attempt = await askClaude(prompt, files);
  let applied = applyChanges(current, attempt.proposal.changes);
  if (applied.errors.length) {
    attempt = await askClaude(prompt, files, { previous: attempt.raw, errors: applied.errors });
    applied = applyChanges(current, attempt.proposal.changes);
  }
  if (applied.errors.length) {
    throw new HttpError(422, "invalid_changes", "Claude's changes could not be applied safely. try rephrasing.", { errors: applied.errors });
  }
  const { summary, notes, commit_message } = attempt.proposal;
  const commitMessage = cleanCommitMessage(commit_message);
  const base = { summary, notes, commitMessage, model: attempt.model, baseSha };
  if (!applied.files.length) return json({ ...base, token: null, files: [], warnings: [] });
  const token = signProposal({
    baseSha,
    prompt: prompt.trim(),
    summary,
    commitMessage,
    files: applied.files.map(({ path, after }) => ({ path, after })),
  });
  return json({
    ...base,
    token,
    warnings: warningsFor(applied.files),
    files: applied.files.map((file) => ({
      path: file.path,
      status: file.before === null ? "added" : file.after === null ? "deleted" : "modified",
      diff: diffFor(file),
    })),
  });
}

async function approve(request: Request) {
  requireSession(request, { mutating: true });
  assertConfigured("changes");
  const { token } = await readJson<{ token?: unknown }>(request);
  const proposal = readProposal(token);
  const head = await headSha();
  const headCommit = await getCommit(head);
  if (head !== proposal.baseSha) {
    const [baseTree, headTree] = await Promise.all([getCommit(proposal.baseSha).then((c) => getTree(c.tree)), getTree(headCommit.tree)]);
    const moved = proposal.files.filter((file) => baseTree.get(file.path)?.sha !== headTree.get(file.path)?.sha);
    if (moved.length) {
      throw new HttpError(409, "stale", `the site changed since this was proposed (${moved.map((f) => f.path).join(", ")}). propose it again.`);
    }
  }
  const tree = await createTree(
    headCommit.tree,
    proposal.files.map((file) => (file.after === null ? { path: file.path, sha: null } : { path: file.path, content: file.after })),
  );
  const quoted = proposal.prompt.slice(0, 1500).split("\n").map((line) => `> ${line}`).join("\n");
  const message = `${proposal.commitMessage}\n\n${proposal.summary}\n\nRequested in /admin:\n${quoted}`;
  const sha = await createCommit(message, tree, head);
  const branch = `admin/preview-${sha.slice(0, 7)}`;
  await createBranch(branch, sha);
  return json({ sha, branch, commitUrl: commitUrl(sha) });
}

async function status(request: Request) {
  requireSession(request, { mutating: false });
  assertConfigured("changes");
  const url = new URL(request.url);
  const sha = url.searchParams.get("sha") ?? "";
  const stage = url.searchParams.get("stage");
  if (!SHA.test(sha)) throw new HttpError(400, "bad_request", "invalid commit.");
  if (stage === "check") return json({ stage, ...(await buildCheck(sha)) });
  if (stage === "deploy") return json({ stage, ...(await deployStatus(sha)), commitUrl: commitUrl(sha) });
  throw new HttpError(400, "bad_request", "unknown stage.");
}

async function promote(request: Request) {
  requireSession(request, { mutating: true });
  assertConfigured("changes");
  const { sha, branch, skipCheck } = await readJson<{ sha?: string; branch?: string; skipCheck?: boolean }>(request);
  if (!sha || !SHA.test(sha) || branch !== `admin/preview-${sha.slice(0, 7)}`) throw new HttpError(400, "bad_request", "invalid preview.");
  if ((await branchSha(branch)) !== sha) throw new HttpError(409, "stale", "this preview no longer exists. propose the change again.");
  const commit = await getCommit(sha);
  if (!commit.message.startsWith("admin:") || commit.parents.length !== 1) throw new HttpError(400, "bad_request", "not an admin preview commit.");
  const [tree, parentTree] = await Promise.all([getTree(commit.tree), getCommit(commit.parents[0]).then((p) => getTree(p.tree))]);
  const touched = changedPaths(parentTree, tree);
  if (!touched.length || touched.some((path) => !isEditable(path))) throw new HttpError(400, "bad_request", "this commit changes files outside the admin allowlist.");
  const check = await buildCheck(sha);
  if (check.state !== "success" && !(skipCheck && check.state === "missing")) {
    throw new HttpError(409, "check_not_passed", check.state === "failure" ? "the build check failed, so this change was not published." : "the build check hasn't passed yet.");
  }
  if (commit.parents[0] !== (await headSha())) {
    throw new HttpError(409, "stale", "main changed while the build check ran. discard this and propose the change again.");
  }
  await fastForward(env.branch, sha);
  await deleteBranch(branch);
  return json({ sha, commitUrl: commitUrl(sha) });
}

async function discard(request: Request) {
  requireSession(request, { mutating: true });
  assertConfigured("changes");
  const { branch } = await readJson<{ branch?: string }>(request);
  if (!branch || !PREVIEW.test(branch)) throw new HttpError(400, "bad_request", "invalid preview branch.");
  await deleteBranch(branch);
  return json({ ok: true });
}

type HistoryItem = { sha: string; title: string; date: string; url: string; kind: "admin" | "undo"; reverted: boolean };

async function adminHistory(): Promise<HistoryItem[]> {
  const commits = await listCommits(100);
  const reverted = new Set<string>();
  for (const commit of commits) for (const match of commit.message.matchAll(/This reverts commit ([0-9a-f]{40})/g)) reverted.add(match[1]);
  return commits
    .map((commit) => {
      const title = commit.message.split("\n")[0];
      const kind: HistoryItem["kind"] | null = title.startsWith("admin:") ? "admin" : title.startsWith('Revert "admin:') ? "undo" : null;
      return kind ? { sha: commit.sha, title, date: commit.date, url: commit.url, kind, reverted: reverted.has(commit.sha) } : null;
    })
    .filter((item): item is HistoryItem => item !== null);
}

async function history(request: Request) {
  requireSession(request, { mutating: false });
  assertConfigured("changes");
  const items = await adminHistory();
  const undoable = items.find((item) => item.kind === "admin" && !item.reverted) ?? null;
  return json({ items: items.slice(0, 20), undoable });
}

async function undo(request: Request) {
  requireSession(request, { mutating: true });
  assertConfigured("changes");
  const { sha: expected } = await readJson<{ sha?: string }>(request);
  const target = (await adminHistory()).find((item) => item.kind === "admin" && !item.reverted);
  if (!target) throw new HttpError(404, "nothing_to_undo", "there is no admin change left to undo.");
  if (expected && expected !== target.sha) throw new HttpError(409, "stale", "the latest admin change is different now. refresh and try again.");
  const commit = await getCommit(target.sha);
  if (commit.parents.length !== 1) throw new HttpError(409, "cannot_undo", "this change can't be undone automatically.");
  const head = await headSha();
  const headCommit = await getCommit(head);
  const [tree, parentTree, headTree] = await Promise.all([getTree(commit.tree), getCommit(commit.parents[0]).then((p) => getTree(p.tree)), getTree(headCommit.tree)]);
  const paths = changedPaths(parentTree, tree);
  if (paths.some((path) => !isEditable(path))) throw new HttpError(409, "cannot_undo", "this change touched files the admin page can't edit.");
  const later = paths.filter((path) => headTree.get(path)?.sha !== tree.get(path)?.sha);
  if (later.length) {
    throw new HttpError(409, "cannot_undo", `a later change also edited ${later.join(", ")}, so this can't be undone automatically.`);
  }
  const newTree = await createTree(
    headCommit.tree,
    paths.map((path) => ({ path, sha: parentTree.get(path)?.sha ?? null })),
  );
  const message = `Revert "${target.title}"\n\nThis reverts commit ${target.sha}.\n\nUndone from /admin.`;
  const sha = await createCommit(message, newTree, head);
  await fastForward(env.branch, sha);
  return json({ sha, commitUrl: commitUrl(sha), reverted: target.sha });
}

const routes: Record<string, { GET?: (r: Request) => Promise<Response>; POST?: (r: Request) => Promise<Response> }> = {
  session: { GET: session },
  login: { POST: login },
  logout: { POST: logout },
  propose: { POST: propose },
  approve: { POST: approve },
  status: { GET: status },
  promote: { POST: promote },
  discard: { POST: discard },
  history: { GET: history },
  undo: { POST: undo },
};

export async function handle(request: Request): Promise<Response> {
  try {
    const action = new URL(request.url).pathname.replace(/\/+$/, "").split("/").pop() ?? "";
    const route = routes[action];
    if (!route) throw new HttpError(404, "not_found", "unknown admin action.");
    const handler = route[request.method as "GET" | "POST"];
    if (!handler) throw new HttpError(405, "method_not_allowed", "method not allowed.");
    return await handler(request);
  } catch (error) {
    return errorResponse(error);
  }
}
