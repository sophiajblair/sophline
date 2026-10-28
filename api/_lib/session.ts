import { randomToken, safeEqual, sha256, sign, verify } from "./crypto.js";
import { env, missing } from "./env.js";
import { HttpError, assertSameOrigin, cookies } from "./http.js";

export const COOKIE = "__Host-sophline_admin";
export const SESSION_SECONDS = 30 * 60;

type Session = { exp: number; csrf: string };

/** Changing ADMIN_PASSWORD or ADMIN_SESSION_SECRET invalidates every existing session and proposal. */
export function signingKey(): string {
  const secret = env.sessionSecret;
  const password = env.adminPassword;
  if (!secret || !password) throw new HttpError(503, "not_configured", "admin is not configured.", { missing: missing("auth") });
  return `${secret}:${sha256(password).toString("base64url")}`;
}

export function assertConfigured(feature: "auth" | "changes") {
  const gaps = missing(feature);
  if (gaps.length) {
    throw new HttpError(503, "not_configured", `admin is not configured. missing in Vercel: ${gaps.join(", ")}.`, { missing: gaps });
  }
}

export function createSession(): { cookie: string; csrf: string } {
  const csrf = randomToken(24);
  const token = sign(signingKey(), "session", { exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS, csrf } satisfies Session);
  return { cookie: `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`, csrf };
}

export const clearCookie = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

export function readSession(request: Request): Session | null {
  const session = verify<Session>(signingKey(), "session", cookies(request)[COOKIE]);
  if (!session || typeof session.exp !== "number" || session.exp < Date.now() / 1000) return null;
  return session;
}

export function requireSession(request: Request, { mutating }: { mutating: boolean }): Session {
  const session = readSession(request);
  if (!session) throw new HttpError(401, "unauthorised", "your session has expired. log in again.");
  if (mutating) {
    assertSameOrigin(request);
    const header = request.headers.get("x-csrf-token") ?? "";
    if (!header || !safeEqual(header, session.csrf)) throw new HttpError(403, "csrf", "security token mismatch. reload the page and try again.");
  }
  return session;
}
