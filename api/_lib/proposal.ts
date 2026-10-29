import { createTwoFilesPatch } from "diff";
import { sign, verify } from "./crypto.js";
import type { ProposedChange } from "./claude.js";
import { HttpError } from "./http.js";
import { MAX_CHANGED_FILES, MAX_FILE_BYTES, isEditable, looksLikeSecret, normalisePath } from "./policy.js";
import { signingKey } from "./session.js";

export type FileResult = { path: string; after: string | null };

export type Applied = { files: (FileResult & { before: string | null })[]; errors: string[] };

const count = (haystack: string, needle: string) => {
  let n = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) n += 1;
  return n;
};

export function applyChanges(current: Map<string, string>, changes: ProposedChange[]): Applied {
  const errors: string[] = [];
  const out = new Map<string, FileResult & { before: string | null }>();
  if (changes.length > MAX_CHANGED_FILES) errors.push(`too many files (${changes.length}); the limit is ${MAX_CHANGED_FILES}.`);
  for (const change of changes) {
    const path = normalisePath(change.path);
    if (!path || !isEditable(path)) {
      errors.push(`${change.path}: this file is not allowed to change from /admin.`);
      continue;
    }
    const existing = out.get(path)?.after ?? current.get(path) ?? null;
    const before = out.get(path)?.before ?? current.get(path) ?? null;
    if (change.action === "delete") {
      if (existing === null) errors.push(`${path}: cannot delete a file that does not exist.`);
      else out.set(path, { path, before, after: null });
      continue;
    }
    if (change.action === "create") {
      if (existing !== null) errors.push(`${path}: already exists; use "edit".`);
      else out.set(path, { path, before, after: change.content });
      continue;
    }
    if (existing === null) {
      errors.push(`${path}: does not exist; use "create".`);
      continue;
    }
    let next = existing;
    change.edits.forEach((edit, index) => {
      const hits = edit.find ? count(next, edit.find) : 0;
      if (hits !== 1) {
        errors.push(`${path} edit ${index + 1}: "find" text matched ${hits} times (it must match exactly once): ${JSON.stringify(edit.find.slice(0, 80))}`);
        return;
      }
      next = next.replace(edit.find, () => edit.replace);
    });
    out.set(path, { path, before, after: next });
  }
  for (const file of out.values()) {
    if (file.after !== null && Buffer.byteLength(file.after, "utf8") > MAX_FILE_BYTES) errors.push(`${file.path}: file would be too large.`);
    if (file.after !== null && looksLikeSecret(file.after)) errors.push(`${file.path}: contains something that looks like a secret key.`);
  }
  return { files: [...out.values()].filter((file) => file.before !== file.after), errors };
}

export function diffFor(file: { path: string; before: string | null; after: string | null }): string {
  return createTwoFilesPatch(
    file.before === null ? "/dev/null" : `a/${file.path}`,
    file.after === null ? "/dev/null" : `b/${file.path}`,
    file.before ?? "",
    file.after ?? "",
    "",
    "",
    { context: 3 },
  );
}

const URL_PATTERN = /https?:\/\/[^\s"'`)<>]+/g;

/** Things Hannah should look at closely before approving. */
export function warningsFor(files: { path: string; before: string | null; after: string | null }[]): string[] {
  const warnings: string[] = [];
  for (const file of files) {
    if (file.after === null) warnings.push(`deletes ${file.path}.`);
    const before = new Set(file.before?.match(URL_PATTERN) ?? []);
    const added = [...new Set(file.after?.match(URL_PATTERN) ?? [])].filter((url) => !before.has(url));
    for (const url of added) warnings.push(`new link in ${file.path}: ${url} — open it and check it says what the site claims.`);
    if (file.path === "src/content/sources.ts" && file.before !== null) warnings.push("changes the sources list. check every citation still matches.");
  }
  return warnings;
}

/** A change that has been committed to a preview branch, signed so the browser can hand it back. */
export type ProposalData = {
  baseSha: string;
  prompt: string;
  summary: string;
  commitMessage: string;
  sha: string;
  branch: string;
  /** what each automatic build fix changed, oldest first */
  fixes: string[];
};

type ProposalToken = ProposalData & { v: 2; exp: number };

const PROPOSAL_SECONDS = 30 * 60;

export function signProposal(data: ProposalData): string {
  return sign(signingKey(), "proposal", { v: 2, exp: Math.floor(Date.now() / 1000) + PROPOSAL_SECONDS, ...data } satisfies ProposalToken);
}

export function readProposal(token: unknown): ProposalData {
  const proposal = typeof token === "string" ? verify<ProposalToken>(signingKey(), "proposal", token) : null;
  if (!proposal || proposal.v !== 2 || !/^[0-9a-f]{40}$/.test(proposal.sha) || proposal.branch !== `admin/preview-${proposal.sha.slice(0, 7)}`) {
    throw new HttpError(400, "bad_proposal", "this proposal is not valid. propose the change again.");
  }
  if (proposal.exp < Date.now() / 1000) throw new HttpError(410, "expired", "this proposal expired. propose the change again.");
  return proposal;
}

export function cleanCommitMessage(message: string): string {
  const line = (message || "update site content").split("\n")[0].replace(/^admin:\s*/i, "").trim().slice(0, 72);
  return `admin: ${line || "update site content"}`;
}
