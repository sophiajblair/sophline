import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env.js";
import { HttpError } from "./http.js";
import { policySummary } from "./policy.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

export type ProposedChange = {
  path: string;
  action: "edit" | "create" | "delete";
  edits: { find: string; replace: string }[];
  content: string;
};

export type ClaudeProposal = { summary: string; commit_message: string; notes: string; changes: ProposedChange[] };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "commit_message", "notes", "changes"],
  properties: {
    summary: { type: "string" },
    commit_message: { type: "string" },
    notes: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "action", "edits", "content"],
        properties: {
          path: { type: "string" },
          action: { type: "string", enum: ["edit", "create", "delete"] },
          edits: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["find", "replace"],
              properties: { find: { type: "string" }, replace: { type: "string" } },
            },
          },
          content: { type: "string" },
        },
      },
    },
  },
} as const;

export type RepoFile = { path: string; content: string };

export type ClaudeContext = {
  prompt: string;
  /** editable files, exactly as the edits will be applied to */
  files: RepoFile[];
  /** config and entry files Claude may read but never change */
  readOnly: RepoFile[];
  importMap: string;
  /** set when asking for a fix after the build check failed on a preview branch */
  fix?: { errors: string[]; summary: string; related: string[]; attempt: number; maxAttempts: number };
};

function filesBlock(files: RepoFile[], readOnly = false) {
  return files.map((file) => `<file path="${file.path}"${readOnly ? " readonly" : ""}>\n${file.content}\n</file>`).join("\n\n");
}

function fixRequest(fix: NonNullable<ClaudeContext["fix"]>) {
  return [
    `Your change for this request ("${fix.summary}") is already applied in the editable files above: they are the preview branch, not main.`,
    `The build check (eslint, tsc -b, vite build) failed with:`,
    fix.errors.map((error) => `- ${error}`).join("\n"),
    `Files you edited and every file that imports them or that they import (all shown in full above): ${fix.related.join(", ")}.`,
    `This is fix attempt ${fix.attempt} of ${fix.maxAttempts}. Return only the edits needed to make lint, typecheck and build pass against the files exactly as shown, while still doing what Hannah asked. If you changed how a component or function is called, update its definition (Props, parameters, exported types) too. Use "summary" to say what you fixed.`,
  ].join("\n\n");
}

/** Asks Claude for edits. `retry` re-asks once with the problems from a previous attempt that could not be applied. */
export async function askClaude(context: ClaudeContext, retry?: { previous: string; errors: string[] }): Promise<{ proposal: ClaudeProposal; raw: string; model: string }> {
  const client = new Anthropic({ apiKey: env.anthropicKey, maxRetries: 2 });
  const where = context.fix ? "preview branch, with your change applied" : "main branch";
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            `File policy:\n${policySummary}`,
            `Import map (who imports whom among the repo's own files):\n${context.importMap}`,
            `Read-only files (for context: entry point, types, lint and TypeScript config, dependencies). Never change these:\n\n${filesBlock(context.readOnly, true)}`,
            `Current editable files (${where}):\n\n${filesBlock(context.files)}`,
          ].join("\n\n"),
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: `Hannah's request:\n<request>\n${context.prompt}\n</request>${context.fix ? `\n\n${fixRequest(context.fix)}` : ""}` },
      ],
    },
  ];
  if (retry) {
    messages.push({ role: "assistant", content: retry.previous });
    messages.push({
      role: "user",
      content: `Those changes could not be applied:\n- ${retry.errors.join("\n- ")}\n\nReturn the complete corrected JSON again: every change from your previous reply, the ones that applied as well as the corrected ones, because this reply replaces the previous one entirely. Each "find" must match the current file exactly once.`,
    });
  }
  let message: Anthropic.Message;
  try {
    message = await client.messages
      .stream({
        model: env.model,
        max_tokens: 32000,
        system: SYSTEM_PROMPT,
        messages,
        output_config: { format: { type: "json_schema", schema } },
      })
      .finalMessage();
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("admin: Anthropic error", error.status, error.message);
      if (error.status === 401 || error.status === 403) throw new HttpError(502, "anthropic_auth", "Anthropic rejected the API key. check ANTHROPIC_API_KEY.");
      if (error.status === 404 || error.status === 400)
        throw new HttpError(502, "anthropic_error", `Anthropic refused the request (${error.status}). check ANTHROPIC_MODEL ("${env.model}").`);
      if (error.status === 429 || error.status === 529) throw new HttpError(503, "anthropic_busy", "Claude is busy or rate-limited. try again in a minute.");
    }
    throw new HttpError(502, "anthropic_error", "could not reach Claude. try again.");
  }
  if (message.stop_reason === "refusal") throw new HttpError(422, "refused", "Claude declined this request.");
  if (message.stop_reason === "max_tokens") throw new HttpError(422, "too_big", "the change was too large to write in one go. try a smaller request.");
  const raw = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  let proposal: ClaudeProposal;
  try {
    proposal = JSON.parse(raw) as ClaudeProposal;
  } catch {
    throw new HttpError(502, "anthropic_error", "Claude's reply was not valid JSON. try again.");
  }
  if (!Array.isArray(proposal.changes)) throw new HttpError(502, "anthropic_error", "Claude's reply was missing changes.");
  return { proposal, raw, model: message.model };
}
