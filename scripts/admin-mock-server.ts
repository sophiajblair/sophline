/**
 * Local end-to-end harness for /admin with fake GitHub and Anthropic APIs. Nothing leaves this machine.
 *
 *   npm run build && npm run admin:mock
 *   open http://localhost:8787/admin   (password: local-mock-password)
 *
 * Prompts containing "doorbell" edit the doorbell tooltip; "break" makes the build check fail;
 * "package.json" asks for a forbidden file; "nothing" returns no changes. Anything else edits the feed tooltip.
 */
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const APP_PORT = Number(process.env.PORT ?? 8787);
const GITHUB_PORT = APP_PORT + 1;
const ANTHROPIC_PORT = APP_PORT + 2;
const ROOT = process.cwd();

Object.assign(process.env, {
  ADMIN_PASSWORD: "local-mock-password",
  ADMIN_SESSION_SECRET: "local-mock-session-secret-0123456789abcdef",
  ANTHROPIC_API_KEY: "mock-anthropic-key",
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${ANTHROPIC_PORT}`,
  GITHUB_TOKEN: "mock-github-token",
  GITHUB_API_URL: `http://127.0.0.1:${GITHUB_PORT}`,
  GITHUB_REPO: "hannahblair/sophline",
  GITHUB_BRANCH: "main",
});

// ---------- fake git ----------
type CommitObj = { tree: string; message: string; parents: string[]; date: string };
const blobs = new Map<string, string>();
const trees = new Map<string, Map<string, string>>();
const commits = new Map<string, CommitObj>();
const refs = new Map<string, string>();
const pushedAt = new Map<string, number>();
const promotedAt = new Map<string, number>();

const sha1 = (value: string) => createHash("sha1").update(value).digest("hex");
const putBlob = (content: string) => {
  const sha = sha1(`blob ${Buffer.byteLength(content)}\0${content}`);
  blobs.set(sha, content);
  return sha;
};
const putTree = (entries: Map<string, string>) => {
  const sha = sha1(JSON.stringify([...entries].sort()));
  trees.set(sha, entries);
  return sha;
};
const putCommit = (commit: CommitObj) => {
  const sha = sha1(JSON.stringify(commit) + randomBytes(4).toString("hex"));
  commits.set(sha, commit);
  return sha;
};

async function seed() {
  const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const entries = new Map<string, string>();
  for (const path of files) {
    if (/\.(woff2|png|jpg|mp4|webm)$/.test(path)) continue;
    entries.set(path, putBlob(await readFile(join(ROOT, path), "utf8")));
  }
  const first = putCommit({ tree: putTree(entries), message: "initial import", parents: [], date: new Date(Date.now() - 86_400_000).toISOString() });
  refs.set("main", first);
}

const isAncestor = (ancestor: string, sha: string): boolean => {
  let current: string | undefined = sha;
  while (current) {
    if (current === ancestor) return true;
    current = commits.get(current)?.parents[0];
  }
  return false;
};

const changedFiles = (sha: string) => {
  const commit = commits.get(sha)!;
  const tree = trees.get(commit.tree)!;
  const parent = commit.parents[0] ? trees.get(commits.get(commit.parents[0])!.tree)! : new Map<string, string>();
  return [...tree].filter(([path, blob]) => parent.get(path) !== blob).map(([path, blob]) => ({ path, content: blobs.get(blob) ?? "" }));
};

const shaForRun = new Map<number, string>();
const runId = (sha: string) => {
  const id = parseInt(sha.slice(0, 7), 16) * 2;
  shaForRun.set(id, sha);
  return id;
};

/** A stand-in for lint + tsc + vite build: BREAK_BUILD markers, and a prop passed to LockScreen that its Props don't declare. */
function checkErrors(sha: string): string[] {
  const tree = trees.get(commits.get(sha)!.tree)!;
  const text = (path: string) => blobs.get(tree.get(path) ?? "") ?? "";
  const errors: string[] = [];
  for (const file of changedFiles(sha)) {
    file.content.split("\n").forEach((line, i) => {
      const col = line.indexOf("BREAK_BUILD");
      if (col !== -1) errors.push(`${file.path}(${i + 1},${col + 1}): error TS2304: Cannot find name 'BREAK_BUILD'.`);
    });
  }
  const app = text("src/App.tsx").split("\n");
  const usage = app.findIndex((line) => line.includes("<LockScreen") && line.includes("hintTone="));
  if (usage !== -1 && !text("src/os/LockScreen.tsx").includes("hintTone?: ")) {
    const col = app[usage].indexOf("<LockScreen") + 2;
    errors.push(
      `src/App.tsx(${usage + 1},${col}): error TS2322: Type '{ time: string; notes: Note[]; onOpen: (app: AppId, t: string | undefined, el: HTMLElement) => void; onUnlock: () => void; hintTone: string; }' is not assignable to type 'IntrinsicAttributes & Props'. — Property 'hintTone' does not exist on type 'IntrinsicAttributes & Props'.`,
    );
  }
  return errors;
}

function checkLog(errors: string[]) {
  const stamp = () => new Date().toISOString().replace("Z", "0000Z");
  const lines = ["##[group]Run node scripts/admin-check.mjs", "##[endgroup]", "", "\u001b[1madmin check\u001b[0m"];
  if (errors.length) {
    lines.push("::group::admin check errors", ...errors.map((e) => `ADMIN_CHECK_ERROR ${e.replace(/^(.+?)\((\d+),(\d+)\): error /, "$1:$2:$3 ")}`), "::endgroup::");
    lines.push(`${errors.length} errors: lint ok, typecheck failed, build ok.`, "##[error]Process completed with exit code 1.");
  } else lines.push("admin check passed: lint, typecheck and build.");
  return lines.map((line) => `${stamp()} ${line}`).join("\n");
}

async function body(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

const github = createServer(async (req, res) => {
  if (req.headers.authorization !== "Bearer mock-github-token") return send(res, 401, { message: "Bad credentials" });
  const url = new URL(req.url ?? "/", "http://x");
  const prefix = "/repos/hannahblair/sophline";
  if (!url.pathname.startsWith(prefix)) return send(res, 404, { message: "Not Found" });
  const path = url.pathname.slice(prefix.length);
  const input = req.method === "GET" || req.method === "DELETE" ? {} : JSON.parse((await body(req)) || "{}");
  let m: RegExpMatchArray | null;

  if ((m = path.match(/^\/git\/refs?\/heads\/(.+)$/))) {
    const name = decodeURIComponent(m[1]);
    if (req.method === "GET") return refs.has(name) ? send(res, 200, { object: { sha: refs.get(name) } }) : send(res, 404, { message: "Not Found" });
    if (req.method === "DELETE") return refs.delete(name) ? (res.writeHead(204), res.end()) : send(res, 422, { message: "Reference does not exist" });
    if (req.method === "PATCH") {
      const current = refs.get(name);
      if (!current || !commits.has(input.sha)) return send(res, 422, { message: "Invalid" });
      if (!input.force && !isAncestor(current, input.sha)) return send(res, 422, { message: "Update is not a fast forward" });
      refs.set(name, input.sha);
      if (name === "main") promotedAt.set(input.sha, Date.now());
      return send(res, 200, { object: { sha: input.sha } });
    }
  }
  if (path === "/git/refs" && req.method === "POST") {
    const name = String(input.ref).replace(/^refs\/heads\//, "");
    if (refs.has(name)) return send(res, 422, { message: "Reference already exists" });
    refs.set(name, input.sha);
    pushedAt.set(input.sha, Date.now());
    return send(res, 201, { ref: input.ref, object: { sha: input.sha } });
  }
  if ((m = path.match(/^\/git\/commits\/([0-9a-f]{40})$/)) && req.method === "GET") {
    const c = commits.get(m[1]);
    if (!c) return send(res, 404, { message: "Not Found" });
    return send(res, 200, { sha: m[1], message: c.message, tree: { sha: c.tree }, parents: c.parents.map((sha) => ({ sha })), committer: { date: c.date } });
  }
  if (path === "/git/commits" && req.method === "POST") {
    if (!trees.has(input.tree) || input.parents.some((p: string) => !commits.has(p))) return send(res, 422, { message: "Invalid" });
    const sha = putCommit({ tree: input.tree, message: input.message, parents: input.parents, date: new Date().toISOString() });
    return send(res, 201, { sha });
  }
  if ((m = path.match(/^\/git\/trees\/([0-9a-f]{40})$/)) && req.method === "GET") {
    const tree = trees.get(m[1]);
    if (!tree) return send(res, 404, { message: "Not Found" });
    return send(res, 200, {
      truncated: false,
      tree: [...tree].map(([p, sha]) => ({ path: p, mode: "100644", type: "blob", sha, size: Buffer.byteLength(blobs.get(sha) ?? "") })),
    });
  }
  if (path === "/git/trees" && req.method === "POST") {
    const base = trees.get(input.base_tree);
    if (!base) return send(res, 422, { message: "Invalid base_tree" });
    const next = new Map(base);
    for (const entry of input.tree as { path: string; sha?: string | null; content?: string }[]) {
      if (entry.content !== undefined) next.set(entry.path, putBlob(entry.content));
      else if (entry.sha === null) {
        if (!next.delete(entry.path)) return send(res, 422, { message: `path ${entry.path} not in tree` });
      } else if (entry.sha && blobs.has(entry.sha)) next.set(entry.path, entry.sha);
      else return send(res, 422, { message: "Invalid tree entry" });
    }
    return send(res, 201, { sha: putTree(next) });
  }
  if ((m = path.match(/^\/git\/blobs\/([0-9a-f]{40})$/))) {
    const content = blobs.get(m[1]);
    if (content === undefined) return send(res, 404, { message: "Not Found" });
    return send(res, 200, { content: Buffer.from(content).toString("base64"), encoding: "base64" });
  }
  if (path === "/commits" && req.method === "GET") {
    const out = [];
    let sha: string | undefined = refs.get(url.searchParams.get("sha") ?? "main");
    while (sha && out.length < Number(url.searchParams.get("per_page") ?? 30)) {
      const c: CommitObj = commits.get(sha)!;
      out.push({ sha, html_url: `https://github.com/hannahblair/sophline/commit/${sha}`, commit: { message: c.message, committer: { date: c.date } } });
      sha = c.parents[0];
    }
    return send(res, 200, out);
  }
  if (path === "/actions/runs" && req.method === "GET") {
    const sha = url.searchParams.get("head_sha") ?? "";
    const at = pushedAt.get(sha);
    if (!at) return send(res, 200, { workflow_runs: [] });
    const age = Date.now() - at;
    const run = {
      id: runId(sha),
      name: "admin build check",
      html_url: `https://github.com/hannahblair/sophline/actions/runs/${runId(sha)}`,
      status: age < 2500 ? "queued" : age < 6000 ? "in_progress" : "completed",
      conclusion: age < 6000 ? null : checkErrors(sha).length ? "failure" : "success",
    };
    return send(res, 200, { workflow_runs: [run] });
  }
  if ((m = path.match(/^\/actions\/runs\/(\d+)\/jobs$/))) {
    const sha = shaForRun.get(Number(m[1]));
    if (!sha) return send(res, 404, { message: "Not Found" });
    return send(res, 200, { jobs: [{ id: Number(m[1]) + 1, name: "build", status: "completed", conclusion: checkErrors(sha).length ? "failure" : "success" }] });
  }
  if ((m = path.match(/^\/actions\/jobs\/(\d+)\/logs$/))) {
    const sha = shaForRun.get(Number(m[1]) - 1);
    if (!sha) return send(res, 404, { message: "Not Found" });
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end(checkLog(checkErrors(sha)));
  }
  if ((m = path.match(/^\/commits\/([0-9a-f]{40})\/status$/))) {
    const at = promotedAt.get(m[1]);
    const statuses = at
      ? [{ context: "Vercel", state: Date.now() - at < 5000 ? "pending" : "success", description: "mock deployment", target_url: "https://vercel.com/fun-projects/sophline/mock" }]
      : [];
    return send(res, 200, { state: statuses[0]?.state ?? "pending", statuses });
  }
  send(res, 404, { message: `mock GitHub: no route for ${req.method} ${path}` });
});

// ---------- fake Anthropic ----------
type MockReply = { summary: string; commit_message: string; notes: string; changes: unknown[] };

function replyFor(request: string, files: string): MockReply {
  if (/nothing/i.test(request)) return { summary: "no change needed.", commit_message: "no-op", notes: "nothing to change for that request.", changes: [] };
  if (/package\.json/i.test(request)) {
    return {
      summary: "adds a dependency.",
      commit_message: "add dependency",
      notes: "",
      changes: [{ path: "package.json", action: "edit", edits: [{ find: '"private": true', replace: '"private": false' }], content: "" }],
    };
  }
  if (/doorbell/i.test(request)) {
    return {
      summary: "shortens the doorbell tooltip title.",
      commit_message: "Shorten the doorbell tooltip title",
      notes: "",
      changes: [
        {
          path: "src/content/annotations.ts",
          action: "edit",
          edits: [{ find: 'title: "not ‘sold’. worse in some ways: it’s all in-house.",', replace: 'title: "not ‘sold’. still all in-house.",' }],
          content: "",
        },
      ],
    };
  }
  const fixing = request.includes("The build check (eslint, tsc -b, vite build) failed with:");
  // "hint": the first reply passes a prop LockScreen doesn't declare (like the real TS2322); the fix adds it to Props.
  if (/hint/i.test(request)) {
    if (!fixing) {
      return {
        summary: "gives the lock screen hint a calm tone.",
        commit_message: "Give the lock screen hint a calm tone",
        notes: "",
        changes: [{ path: "src/App.tsx", action: "edit", edits: [{ find: "<LockScreen time={time}", replace: '<LockScreen hintTone="calm" time={time}' }], content: "" }],
      };
    }
    return {
      summary: "declares hintTone in LockScreen's Props and uses it on the hint.",
      commit_message: "Declare hintTone on LockScreen",
      notes: "",
      changes: [
        {
          path: "src/os/LockScreen.tsx",
          action: "edit",
          edits: [
            { find: "  onUnlock: () => void;\n};", replace: "  onUnlock: () => void;\n  hintTone?: string;\n};" },
            { find: "({ time, notes, onOpen, onUnlock }: Props)", replace: "({ time, notes, onOpen, onUnlock, hintTone }: Props)" },
            { find: '<p className="lock-hint">', replace: '<p className="lock-hint" data-tone={hintTone}>' },
          ],
          content: "",
        },
      ],
    };
  }
  const breaking = /break/i.test(request);
  // "break" stays broken: every fix attempt swaps the marker for another one.
  const marker = fixing ? files.match(/\/\* BREAK_BUILD[^*]*\*\//)?.[0] : undefined;
  if (breaking && marker) {
    return {
      summary: "tries to fix the broken line (mock: still broken).",
      commit_message: "Try to fix the broken line",
      notes: "",
      changes: [{ path: "src/content/annotations.ts", action: "edit", edits: [{ find: marker, replace: `/* BREAK_BUILD again ${Date.now()} */` }], content: "" }],
    };
  }
  return {
    summary: breaking ? "adds a line that fails the build (test)." : "sharpens the feed tooltip title.",
    commit_message: breaking ? "Add a deliberately broken line" : "Sharpen the feed tooltip title",
    notes: breaking ? "this is a mock that the build check will reject." : "",
    changes: [
      {
        path: "src/content/annotations.ts",
        action: "edit",
        edits: [
          breaking
            ? { find: 'title: "you never said you liked that.', replace: '/* BREAK_BUILD */ title: "you never said you liked that.' }
            : { find: 'title: "you never said you liked that.",', replace: 'title: "you never said you liked that. it noticed anyway.",' },
        ],
        content: "",
      },
    ],
  };
}

const anthropic = createServer(async (req, res) => {
  if (req.url?.split("?")[0] !== "/v1/messages" || req.method !== "POST") return send(res, 404, { type: "error", error: { type: "not_found_error", message: "no route" } });
  const key = req.headers["x-api-key"] ?? req.headers.authorization?.replace(/^Bearer /, "");
  if (key !== "mock-anthropic-key") return send(res, 401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } });
  const request = JSON.parse(await body(req));
  const blocks = request.messages[0].content as { text: string }[];
  const filesBlock = blocks[0].text;
  const ask = blocks[1].text;
  const fileCount = (filesBlock.match(/<file path=/g) ?? []).length;
  console.log(
    `[mock anthropic] model=${request.model} files=${fileCount} hasPackageJson=${filesBlock.includes('path="package.json"')} schema=${request.output_config?.format?.type} system=${String(request.system).slice(0, 40)}…`,
  );
  const text = JSON.stringify(replyFor(ask, filesBlock));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const message = { id: "msg_mock", type: "message", role: "assistant", model: request.model, content: [] as unknown[], stop_reason: null, stop_sequence: null, usage: { input_tokens: 100, output_tokens: 1 } };
  if (!request.stream) {
    return send(res, 200, { ...message, content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 } });
  }
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  const event = (type: string, data: object) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  event("message_start", { message });
  event("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
  for (let i = 0; i < text.length; i += 120) event("content_block_delta", { index: 0, delta: { type: "text_delta", text: text.slice(i, i + 120) } });
  event("content_block_stop", { index: 0 });
  event("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 50 } });
  event("message_stop", {});
  res.end();
});

// ---------- the app: real handlers + built static files ----------
const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".md": "text/markdown" };

async function main() {
  await seed();
  const { handle } = await import("../api/_lib/actions.js");
  const app = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${APP_PORT}`);
    if (url.pathname.startsWith("/api/admin/")) {
      const hasBody = req.method !== "GET" && req.method !== "HEAD";
      const request = new Request(url, {
        method: req.method,
        headers: Object.entries(req.headers).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v.join(", ") : v] as [string, string]])),
        body: hasBody ? await body(req) : undefined,
      });
      const response = await handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const file = url.pathname === "/admin" || url.pathname === "/admin/" ? "admin/index.html" : url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const safe = normalize(file);
    if (safe.startsWith("..")) return send(res, 400, {});
    try {
      const data = await readFile(join(ROOT, "dist", safe));
      res.writeHead(200, { "content-type": types[extname(safe)] ?? "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  github.listen(GITHUB_PORT, "127.0.0.1");
  anthropic.listen(ANTHROPIC_PORT, "127.0.0.1");
  app.listen(APP_PORT, () => console.log(`admin mock running: http://localhost:${APP_PORT}/admin  (password: local-mock-password)`));
}

void main();
