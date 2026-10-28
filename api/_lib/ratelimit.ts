import { env } from "./env.js";
import { HttpError } from "./http.js";

/**
 * Failed-login tracking. With Upstash Redis (Vercel KV) configured, counts are shared across every
 * function instance. Without it, counts live in this instance's memory only: they reset on cold
 * starts and are not shared between instances, so the lockout is best-effort. The fixed delay on
 * each failure still applies everywhere.
 */

const PER_IP = { limit: 5, windowSeconds: 15 * 60 };
const GLOBAL = { limit: 25, windowSeconds: 60 * 60 };

type Count = { count: number; ttl: number };

const memory = new Map<string, { count: number; expires: number }>();

async function redis(commands: (string | number)[][]): Promise<unknown[]> {
  const response = await fetch(`${env.kvUrl}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.kvToken}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error(`rate-limit store error ${response.status}`);
  const results = (await response.json()) as { result: unknown }[];
  return results.map((r) => r.result);
}

const hasRedis = () => Boolean(env.kvUrl && env.kvToken);

async function peek(key: string): Promise<Count> {
  if (hasRedis()) {
    const [count, ttl] = await redis([
      ["GET", key],
      ["TTL", key],
    ]);
    return { count: Number(count ?? 0), ttl: Math.max(0, Number(ttl ?? 0)) };
  }
  const entry = memory.get(key);
  if (!entry || entry.expires < Date.now()) return { count: 0, ttl: 0 };
  return { count: entry.count, ttl: Math.ceil((entry.expires - Date.now()) / 1000) };
}

async function bump(key: string, windowSeconds: number) {
  if (hasRedis()) {
    await redis([
      ["INCR", key],
      ["EXPIRE", key, windowSeconds, "NX"],
    ]);
    return;
  }
  const entry = memory.get(key);
  if (!entry || entry.expires < Date.now()) memory.set(key, { count: 1, expires: Date.now() + windowSeconds * 1000 });
  else entry.count += 1;
}

async function clear(key: string) {
  if (hasRedis()) await redis([["DEL", key]]);
  else memory.delete(key);
}

const ipKey = (ip: string) => `sophline:login-fail:ip:${ip}`;
const globalKey = "sophline:login-fail:all";

export async function assertNotLocked(ip: string) {
  const [mine, all] = await Promise.all([peek(ipKey(ip)), peek(globalKey)]);
  if (mine.count >= PER_IP.limit) {
    throw new HttpError(429, "locked", `too many wrong passwords. try again in ${Math.ceil(mine.ttl / 60)} min.`, { retryAfter: mine.ttl });
  }
  if (all.count >= GLOBAL.limit) {
    throw new HttpError(429, "locked", `login is paused after too many wrong passwords. try again in ${Math.ceil(all.ttl / 60)} min.`, {
      retryAfter: all.ttl,
    });
  }
  return { remaining: PER_IP.limit - mine.count };
}

export async function recordFailure(ip: string) {
  await Promise.all([bump(ipKey(ip), PER_IP.windowSeconds), bump(globalKey, GLOBAL.windowSeconds)]);
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));
}

export async function recordSuccess(ip: string) {
  await clear(ipKey(ip));
}

export const rateLimitStore = () => (hasRedis() ? "redis" : "memory");
