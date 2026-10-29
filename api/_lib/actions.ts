import { askClaude, type ClaudeContext, type RepoFile } from "./claude.js";
import { buildCheck, deployStatus } from "./deploy.js";
import { env, missing } from "./env.js";
import {
  branchContains,
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
  listBranches,
  listCommits,
  type TreeEntry,
} from "./github.js";
import { HttpError, assertSameOrigin, clientIp, errorResponse, json, readJson } from "./http.js";
import { importGraph, importMapText, relatedFiles, type ImportGraph } from "./imports.js";
import { isEditable } from "./policy.js";
import {
  applyChanges,
  cleanCommitMessage,
  diffFor,
  readProposal,
  signProposal,
  warningsFor,
  type FileResult,
  type ProposalData,
} from "./proposal.js";
import { assertNotLocked, rateLimitStore, recordFailure, recordSuccess } from "./ratelimit.js";
import { safeEqual } from "./crypto.js";
import { assertConfigured, clearCookie, createSession, readSession, requireSession } from "./session.js";

const SHA = /^[0-9a-f]{40}$/;
const PREVIEW = /^admin\/preview-[0-9a-f]{7}$/;
const MAX_CONTEXT_BYTES = 600_000;
const MAX_FIXES = 2;
/** Bumped whenever the admin page and these endpoints change shape, so a tab left open across a deploy is told to reload. */
const ADMIN_PROTOCOL = "3";

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

/** Entry point, ambient types and the build/lint config: sent to Claude for context, never editable. */
const READ_ONLY_CONTEXT = ["src/main.tsx", "src/vite-env.d.ts", "tsconfig.app.json", "eslint.config.js", "package.json"];

type Snapshot = {
  sha: string;
  tree: Map<string, TreeEntry>;
  files: RepoFile[];
  readOnly: RepoFile[];
  graph: ImportGraph;
};

/** Every editable file at `sha` (files related to `priority` first if the budget runs out), plus read-only context. */
async function snapshot(sha: string, priority: string[] = []): Promise<Snapshot> {
  const commit = await getCommit(sha);
  const tree = await getTree(commit.tree);
  const first = new Set(priority);
  const entries = [...tree.values()]
    .filter((entry) => isEditable(entry.path))
    .sort((a, b) => Number(first.has(b.path)) - Number(first.has(a.path)) || a.path.localeCompare(b.path));
  let budget = MAX_CONTEXT_BYTES;
  const chosen = entries.filter((entry) => {
    budget -= entry.size ?? 0;
    return budget >= 0;
  });
  const read = (entry: TreeEntry) => getBlobText(entry.sha).then((content) => ({ path: entry.path, content }));
  const [files, readOnly] = await Promise.all([
    Promise.all(chosen.sort((a, b) => a.path.localeCompare(b.path)).map(read)),
    Promise.all(READ_ONLY_CONTEXT.flatMap((path) => (tree.has(path) ? [read(tree.get(path)!)] : []))),
  ]);
  return { sha, tree, files, readOnly, graph: importGraph(files) };
}

/** Ask Claude, apply its edits to `snap`, and re-ask once if any edit doesn't apply cleanly. */
async function askAndApply(prompt: string, snap: Snapshot, fix?: ClaudeContext["fix"]) {
  const context: ClaudeContext = { prompt, files: snap.files, readOnly: snap.readOnly, importMap: importMapText(snap.graph), fix };
  const current = new Map(snap.files.map((file) => [file.path, file.content]));
  let attempt = await askClaude(context);
  let applied = applyChanges(current, attempt.proposal.changes);
  if (applied.errors.length) {
    attempt = await askClaude(context, { previous: attempt.raw, errors: applied.errors });
    applied = applyChanges(current, attempt.proposal.changes);
  }
  if (applied.errors.length) {
    throw new HttpError(422, "invalid_changes", "Claude's changes could not be applied safely. try rephrasing.", { errors: applied.errors });
  }
  return { ...attempt, applied };
}

function commitMessageFor(p: { commitMessage: string; summary: string; prompt: string; fixes: string[] }) {
  const quoted = p.prompt.slice(0, 1500).split("\n").map((line) => `> ${line}`).join("\n");
  const fixes = p.fixes.length ? `\n\nBuild fixes by Claude after the check failed:\n${p.fixes.map((f) => `- ${f}`).join("\n")}` : "";
  return `${p.commitMessage}\n\n${p.summary}${fixes}\n\nRequested in /admin:\n${quoted}`;
}

/** The inverse of commitMessageFor, to rebuild a proposal from a preview commit. */
function parseCommitMessage(message: string) {
  const [head, requested = ""] = message.split("\n\nRequested in /admin:\n");
  const prompt = requested
    .split("\n")
    .map((line) => line.replace(/^> ?/, ""))
    .join("\n")
    .trim();
  const [titleAndSummary, fixText = ""] = head.split("\n\nBuild fixes by Claude after the check failed:\n");
  const [title, ...rest] = titleAndSummary.split("\n\n");
  const fixes = fixText
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
  return { commitMessage: title.trim(), summary: rest.join("\n\n").trim(), prompt, fixes };
}

/** Commit the change on top of main as an admin/preview-* branch; the build check Action runs on it. */
async function commitPreview(baseSha: string, files: FileResult[], message: string) {
  const head = await headSha();
  const headCommit = await getCommit(head);
  if (head !== baseSha) {
    const [baseTree, headTree] = await Promise.all([getCommit(baseSha).then((c) => getTree(c.tree)), getTree(headCommit.tree)]);
    const moved = files.filter((file) => baseTree.get(file.path)?.sha !== headTree.get(file.path)?.sha);
    if (moved.length) throw new HttpError(409, "stale", `the site changed meanwhile (${moved.map((f) => f.path).join(", ")}). propose it again.`);
  }
  const tree = await createTree(
    headCommit.tree,
    files.map((file) => (file.after === null ? { path: file.path, sha: null } : { path: file.path, content: file.after })),
  );
  const sha = await createCommit(message, tree, head);
  const branch = `admin/preview-${sha.slice(0, 7)}`;
  await createBranch(branch, sha);
  return { sha, branch, parent: head };
}

type ChangedFile = { path: string; before: string | null; after: string | null };

function proposalResponse(p: ProposalData & { notes: string; model: string; changed: ChangedFile[]; token: string }) {
  return {
    token: p.token,
    baseSha: p.baseSha,
    sha: p.sha,
    branch: p.branch,
    commitUrl: commitUrl(p.sha),
    attempt: p.fixes.length,
    maxFixes: MAX_FIXES,
    summary: p.summary,
    fixes: p.fixes,
    notes: p.notes,
    commitMessage: p.commitMessage,
    model: p.model,
    warnings: warningsFor(p.changed),
    files: p.changed.map((file) => ({
      path: file.path,
      status: file.before === null ? "added" : file.after === null ? "deleted" : "modified",
      diff: diffFor(file),
    })),
  };
}

async function propose(request: Request) {
  requireSession(request, { mutating: true });
  assertConfigured("changes");
  const { prompt: raw } = await readJson<{ prompt?: unknown }>(request);
  if (typeof raw !== "string" || raw.trim().length < 3) throw new HttpError(400, "bad_request", "describe the change you want.");
  if (raw.length > 4000) throw new HttpError(400, "bad_request", "keep the request under 4000 characters.");
  const prompt = raw.trim();
  const base = await snapshot(await headSha());
  const { proposal, applied, model } = await askAndApply(prompt, base);
  const { summary, notes } = proposal;
  const commitMessage = cleanCommitMessage(proposal.commit_message);
  if (!applied.files.length) return json({ summary, notes, commitMessage, model, baseSha: base.sha, token: null, files: [], warnings: [] });
  const files = applied.files.map(({ path, after }) => ({ path, after }));
  const { sha, branch } = await commitPreview(base.sha, files, commitMessageFor({ commitMessage, summary, prompt, fixes: [] }));
  const data: ProposalData = { baseSha: base.sha, prompt, summary, commitMessage, sha, branch, fixes: [] };
  return json(proposalResponse({ ...data, notes, model, changed: applied.files, token: signProposal(data) }));
}

/** After a failed build check: give Claude the errors and the preview files, and commit its fix as a new preview. */
async function fix(request: Request) {
  requireSession(request, { mutating: true });
  assertConfigured("changes");
  const { token } = await readJson<{ token?: unknown }>(request);
  const p = readProposal(token);
  if (p.fixes.length >= MAX_FIXES) throw new HttpError(409, "out_of_fixes", `Claude already tried ${MAX_FIXES} fixes. nothing was published.`);
  if ((await branchSha(p.branch)) !== p.sha) throw new HttpError(409, "stale", "this preview no longer exists. propose the change again.");
  const check = await buildCheck(p.sha);
  if (check.state !== "failure") throw new HttpError(409, "not_failed", "the build check hasn't failed, so there is nothing to fix.");
  const errors = check.errors?.length ? check.errors : [check.detail];

  const previewCommit = await getCommit(p.sha);
  const parentSha = previewCommit.parents[0];
  const baseTree = await getCommit(parentSha).then((c) => getTree(c.tree));
  const edited = changedPaths(baseTree, await getTree(previewCommit.tree)).filter(isEditable);
  const errorFiles = errors.map((e) => e.match(/^([\w./-]+\.(?:tsx?|css))[:(]/)?.[1]).filter((f): f is string => Boolean(f));
  const preview = await snapshot(p.sha, [...edited, ...errorFiles]);
  const missingEdited = edited.filter((path) => preview.tree.has(path) && !preview.files.some((file) => file.path === path));
  if (missingEdited.length) throw new HttpError(422, "too_big", "the site is too large to send the changed files to Claude. nothing was published.");
  const related = relatedFiles(preview.graph, [...new Set([...edited, ...errorFiles])]);
  const attempt = p.fixes.length + 1;
  const { proposal, applied, model } = await askAndApply(p.prompt, preview, { errors, summary: p.summary, related, attempt, maxAttempts: MAX_FIXES });
  if (!applied.files.length) {
    throw new HttpError(422, "no_fix", proposal.notes || "Claude couldn't find a fix for the build errors. nothing was published.", { errors });
  }

  const after = new Map(preview.files.map((file) => [file.path, file.content as string | null]));
  for (const file of applied.files) after.set(file.path, file.after);
  const paths = [...new Set([...edited, ...applied.files.map((file) => file.path)])].sort();
  const baseText = async (path: string) => {
    const entry = baseTree.get(path);
    return entry ? getBlobText(entry.sha) : null;
  };
  const changed: ChangedFile[] = (await Promise.all(paths.map(async (path) => ({ path, before: await baseText(path), after: after.get(path) ?? null })))).filter(
    (file) => file.before !== file.after,
  );
  const fixes = [...p.fixes, proposal.summary.trim() || "fixed the build errors."];
  const { sha, branch } = await commitPreview(
    parentSha,
    changed.map(({ path, after }) => ({ path, after })),
    commitMessageFor({ commitMessage: p.commitMessage, summary: p.summary, prompt: p.prompt, fixes }),
  );
  await deleteBranch(p.branch);
  const data: ProposalData = { ...p, baseSha: parentSha, sha, branch, fixes };
  return json({ ...proposalResponse({ ...data, notes: proposal.notes, model, changed, token: signProposal(data) }), fixedErrors: errors });
}

async function status(request: Request) {
  requireSession(request, { mutating: false });
  assertConfigured("changes");
  const url = new URL(request.url);
  const sha = url.searchParams.get("sha") ?? "";
  const stage = url.searchParams.get("stage");
  if (!SHA.test(sha)) throw new HttpError(400, "bad_request", "invalid commit.");
  if (stage === "check") {
    const [check, published] = await Promise.all([buildCheck(sha), branchContains(env.branch, sha)]);
    return json({ stage, ...check, published });
  }
  if (stage === "deploy") return json({ stage, ...(await deployStatus(sha)), commitUrl: commitUrl(sha) });
  throw new HttpError(400, "bad_request", "unknown stage.");
}

/** Hannah's approval: fast-forward main to the preview commit, only once its build check has passed. */
async function approve(request: Request) {
  requireSession(request, { mutating: true });
  assertConfigured("changes");
  const { token, skipCheck } = await readJson<{ token?: unknown; skipCheck?: boolean }>(request);
  const { sha, branch } = readProposal(token);
  if ((await branchSha(branch)) !== sha) {
    if (await branchContains(env.branch, sha)) return json({ sha, commitUrl: commitUrl(sha), already: true });
    throw new HttpError(409, "stale", "this preview no longer exists. propose the change again.");
  }
  const commit = await getCommit(sha);
  if (!commit.message.startsWith("admin:") || commit.parents.length !== 1) throw new HttpError(400, "bad_request", "not an admin preview commit.");
  const [tree, parentTree] = await Promise.all([getTree(commit.tree), getCommit(commit.parents[0]).then((p) => getTree(p.tree))]);
  const touched = changedPaths(parentTree, tree);
  if (!touched.length || touched.some((path) => !isEditable(path))) throw new HttpError(400, "bad_request", "this commit changes files outside the admin allowlist.");
  const check = await buildCheck(sha, { withErrors: false });
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

/** Rebuild a signed proposal from a preview branch, so a reloaded or stuck page can pick it up again. */
async function openPreview(branch: string, sha: string, head: string) {
  const commit = await getCommit(sha);
  if (!commit.message.startsWith("admin:") || commit.parents.length !== 1) return null;
  const [tree, parentTree] = await Promise.all([getTree(commit.tree), getCommit(commit.parents[0]).then((p) => getTree(p.tree))]);
  const paths = changedPaths(parentTree, tree);
  if (!paths.length || paths.some((path) => !isEditable(path))) return null;
  const text = (files: Map<string, TreeEntry>, path: string) => {
    const entry = files.get(path);
    return entry ? getBlobText(entry.sha) : Promise.resolve(null);
  };
  const changed = await Promise.all(paths.map(async (path) => ({ path, before: await text(parentTree, path), after: await text(tree, path) })));
  const parsed = parseCommitMessage(commit.message);
  const data: ProposalData = { baseSha: commit.parents[0], prompt: parsed.prompt || parsed.commitMessage, summary: parsed.summary, commitMessage: parsed.commitMessage, sha, branch, fixes: parsed.fixes };
  const check = await buildCheck(sha);
  return { ...proposalResponse({ ...data, notes: "", model: env.model, changed, token: signProposal(data) }), prompt: data.prompt, check, stale: commit.parents[0] !== head, date: commit.date };
}

/** Preview branches that are still open, with their build check, newest first. */
async function previews(request: Request) {
  requireSession(request, { mutating: false });
  assertConfigured("changes");
  const [branches, head] = await Promise.all([listBranches("admin/preview-"), headSha()]);
  const open = branches.filter((b) => PREVIEW.test(b.name) && b.name === `admin/preview-${b.sha.slice(0, 7)}`).slice(0, 5);
  const items = (await Promise.all(open.map((b) => openPreview(b.name, b.sha, head)))).filter((item) => item !== null);
  items.sort((a, b) => b.date.localeCompare(a.date));
  return json({ items });
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
  fix: { POST: fix },
  status: { GET: status },
  previews: { GET: previews },
  approve: { POST: approve },
  discard: { POST: discard },
  history: { GET: history },
  undo: { POST: undo },
};

export async function handle(request: Request): Promise<Response> {
  try {
    const action = new URL(request.url).pathname.replace(/\/+$/, "").split("/").pop() ?? "";
    if (request.headers.get("x-admin-protocol") !== ADMIN_PROTOCOL) {
      throw new HttpError(409, "client_outdated", "this /admin page is out of date because the site was updated. reload the page.");
    }
    const route = routes[action];
    if (!route) throw new HttpError(404, "not_found", "unknown admin action.");
    const handler = route[request.method as "GET" | "POST"];
    if (!handler) throw new HttpError(405, "method_not_allowed", "method not allowed.");
    return await handler(request);
  } catch (error) {
    return errorResponse(error);
  }
}
