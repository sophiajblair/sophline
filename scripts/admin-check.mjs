/**
 * The admin build check: lint, typecheck and build, all three even when one fails, then one
 * `ADMIN_CHECK_ERROR <file:line:col> <message>` line per error. /admin reads those lines from
 * the job log, shows them to Hannah and hands them back to Claude to fix.
 */
import { spawnSync } from "node:child_process";
import { relative } from "node:path";
import { ESLint } from "eslint";

const MAX_ERRORS = 40;
const errors = [];
const clip = (text, n = 700) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
const oneLine = (text) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

const eslint = new ESLint();
const results = await eslint.lintFiles(["."]);
for (const result of results) {
  for (const message of result.messages) {
    if (message.severity !== 2) continue;
    const file = relative(process.cwd(), result.filePath);
    errors.push({ file, line: message.line ?? 1, col: message.column ?? 1, text: `${oneLine(message.message)}${message.ruleId ? ` (${message.ruleId})` : ""}` });
  }
}
const formatter = await eslint.loadFormatter("stylish");
process.stdout.write(await formatter.format(results));

const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" } });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(output);
  return { ok: result.status === 0, output };
};

const tsc = run("npx", ["tsc", "-b", "--pretty", "false"]);
if (!tsc.ok) {
  const lines = tsc.output.split("\n");
  let found = 0;
  lines.forEach((line, index) => {
    const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
    if (!match) return;
    found += 1;
    const more = [];
    for (let i = index + 1; i < lines.length && /^\s+\S/.test(lines[i]) && more.length < 3; i++) more.push(lines[i].trim());
    errors.push({ file: match[1], line: Number(match[2]), col: Number(match[3]), text: [`${match[4]}: ${match[5]}`, ...more].join(" — ") });
  });
  if (!found) errors.push({ file: "tsc", line: 0, col: 0, text: oneLine(tsc.output.trim().split("\n").slice(-5).join("\n")) || "typecheck failed." });
}

const vite = run("npx", ["vite", "build", "--logLevel", "warn"]);
if (!vite.ok) {
  const lines = vite.output.split("\n").map((line) => line.trim()).filter(Boolean);
  const start = Math.max(0, lines.findIndex((line) => /error during build|\[vite\]|Error:/.test(line)));
  errors.push({ file: "vite build", line: 0, col: 0, text: lines.slice(start, start + 4).join(" — ") || "vite build failed." });
}

if (errors.length) {
  console.log("\n::group::admin check errors");
  for (const error of errors.slice(0, MAX_ERRORS)) {
    const where = error.line ? `${error.file}:${error.line}:${error.col}` : error.file;
    console.log(`ADMIN_CHECK_ERROR ${clip(`${where} ${error.text}`)}`);
    if (error.line) console.log(`::error file=${error.file},line=${error.line},col=${error.col}::${clip(error.text, 300).replace(/[\r\n]/g, " ")}`);
  }
  console.log("::endgroup::");
  console.log(`\n${errors.length} error${errors.length === 1 ? "" : "s"}: lint ${results.some((r) => r.errorCount) ? "failed" : "ok"}, typecheck ${tsc.ok ? "ok" : "failed"}, build ${vite.ok ? "ok" : "failed"}.`);
  process.exit(1);
}
console.log("\nadmin check passed: lint, typecheck and build.");
