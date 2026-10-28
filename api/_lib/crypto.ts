import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Constant-time string comparison. Hashing first makes both sides the same length. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

const b64 = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const unb64 = (value: string) => Buffer.from(value, "base64url").toString("utf8");

function hmac(key: string, payload: string) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** `payload.signature`, where payload is base64url JSON. Used for session cookies and proposal tokens. */
export function sign(key: string, purpose: string, data: object): string {
  const payload = b64(JSON.stringify(data));
  return `${payload}.${hmac(key, `${purpose}.${payload}`)}`;
}

export function verify<T>(key: string, purpose: string, token: string | undefined): T | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, hmac(key, `${purpose}.${payload}`))) return null;
  try {
    return JSON.parse(unb64(payload)) as T;
  } catch {
    return null;
  }
}
