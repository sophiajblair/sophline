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

function filesBlock(files: RepoFile[]) {
  return files.map((file) => `<file path="${file.path}">\n${file.content}\n</file>`).join("\n\n");
}

/** Asks Claude for edits. `retryErrors` re-asks once with the problems from a previous attempt. */
export async function askClaude(
  prompt: string,
  files: RepoFile[],
  retry?: { previous: string; errors: string[] },
): Promise<{ proposal: ClaudeProposal; raw: string; model: string }> {
  const client = new Anthropic({ apiKey: env.anthropicKey, maxRetries: 2 });
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `File policy:\n${policySummary}\n\nCurrent editable files (main branch):\n\n${filesBlock(files)}`,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: `Hannah's request:\n<request>\n${prompt}\n</request>` },
      ],
    },
  ];
  if (retry) {
    messages.push({ role: "assistant", content: retry.previous });
    messages.push({
      role: "user",
      content: `Those changes could not be applied:\n- ${retry.errors.join("\n- ")}\n\nReturn the complete corrected JSON. Each "find" must match the current file exactly once.`,
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
