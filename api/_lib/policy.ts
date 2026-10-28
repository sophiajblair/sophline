/**
 * Which repository files the admin pipeline may read and change. The denylist always wins.
 * Admin code, API code, workflows, dependencies, build config and env files are never editable.
 */

const ALLOW: RegExp[] = [
  /^src\/content\/[\w./-]+\.(ts|tsx|md)$/,
  /^src\/apps\/[\w./-]+\.tsx?$/,
  /^src\/os\/[\w./-]+\.tsx?$/,
  /^src\/phone\/[\w./-]+\.tsx?$/,
  /^src\/pixel\/[\w./-]+\.tsx?$/,
  /^src\/styles\.css$/,
  /^src\/App\.tsx$/,
  /^public\/videos\/README\.md$/,
];

const DENY: RegExp[] = [
  /^api\//,
  /^admin\//,
  /^scripts\//,
  /^\.github\//,
  /(^|\/)\.env/,
  /(^|\/)package(-lock)?\.json$/,
  /(^|\/)(vite|vercel|tsconfig|eslint)[^/]*$/,
  /^index\.html$/,
  /^src\/main\.tsx$/,
  /^src\/vite-env\.d\.ts$/,
  /(^|\/)node_modules\//,
];

export const MAX_FILE_BYTES = 300_000;
export const MAX_CHANGED_FILES = 12;

export function normalisePath(path: string): string | null {
  if (typeof path !== "string" || !path || path.length > 200) return null;
  if (path.startsWith("/") || path.includes("\\") || path.includes("\0")) return null;
  const parts = path.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return null;
  return parts.join("/");
}

export function isEditable(path: string): boolean {
  const clean = normalisePath(path);
  if (!clean) return false;
  if (DENY.some((rule) => rule.test(clean))) return false;
  return ALLOW.some((rule) => rule.test(clean));
}

export const policySummary = [
  "editable: src/content/**, src/apps/**, src/os/**, src/phone/**, src/pixel/**, src/styles.css, src/App.tsx, public/videos/README.md",
  "never editable: api/**, admin/**, scripts/**, .github/**, package.json, package-lock.json, vite/vercel/tsconfig/eslint config, index.html, src/main.tsx, .env files",
].join("\n");

const SECRET_PATTERNS = [/sk-ant-[\w-]{10,}/, /github_pat_\w{20,}/, /gh[pousr]_\w{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bAKIA[0-9A-Z]{16}\b/];

export function looksLikeSecret(content: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(content));
}
