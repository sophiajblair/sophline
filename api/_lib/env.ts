/** All admin configuration comes from Vercel environment variables. Nothing here is ever sent to the browser. */

export const DEFAULT_MODEL = "claude-opus-5-5";

export type Feature = "auth" | "changes";

const read = (name: string) => {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
};

export const env = {
  get adminPassword() {
    return read("ADMIN_PASSWORD");
  },
  get sessionSecret() {
    return read("ADMIN_SESSION_SECRET");
  },
  get anthropicKey() {
    return read("ANTHROPIC_API_KEY");
  },
  get model() {
    return read("ANTHROPIC_MODEL") ?? DEFAULT_MODEL;
  },
  get githubToken() {
    return read("GITHUB_TOKEN");
  },
  get githubApi() {
    return (read("GITHUB_API_URL") ?? "https://api.github.com").replace(/\/$/, "");
  },
  get repo() {
    return read("GITHUB_REPO") ?? "hannahblair/sophline";
  },
  get branch() {
    return read("GITHUB_BRANCH") ?? "main";
  },
  get vercelToken() {
    return read("VERCEL_TOKEN");
  },
  get vercelProjectId() {
    return read("VERCEL_PROJECT_ID");
  },
  get vercelTeamId() {
    return read("VERCEL_TEAM_ID");
  },
  get kvUrl() {
    return read("KV_REST_API_URL") ?? read("UPSTASH_REDIS_REST_URL");
  },
  get kvToken() {
    return read("KV_REST_API_TOKEN") ?? read("UPSTASH_REDIS_REST_TOKEN");
  },
};

/** Names (never values) of variables that are missing or unusable for a feature. */
export function missing(feature: Feature): string[] {
  const out: string[] = [];
  const password = env.adminPassword;
  const secret = env.sessionSecret;
  if (!password) out.push("ADMIN_PASSWORD");
  else if (password.length < 12) out.push("ADMIN_PASSWORD (must be at least 12 characters)");
  if (!secret) out.push("ADMIN_SESSION_SECRET");
  else if (secret.length < 32) out.push("ADMIN_SESSION_SECRET (must be at least 32 characters)");
  if (feature === "changes") {
    if (!env.anthropicKey) out.push("ANTHROPIC_API_KEY");
    if (!env.githubToken) out.push("GITHUB_TOKEN");
  }
  return out;
}
