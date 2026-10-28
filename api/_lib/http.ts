export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const baseHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
  "x-content-type-options": "nosniff",
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...baseHeaders, ...headers } });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const headers: Record<string, string> = {};
    if (typeof error.extra.retryAfter === "number") headers["retry-after"] = String(error.extra.retryAfter);
    return json({ error: error.code, message: error.message, ...error.extra }, error.status, headers);
  }
  console.error("admin: unexpected error", error);
  return json({ error: "server_error", message: "something went wrong on the server. check the Vercel function logs." }, 500);
}

const MAX_BODY = 2_000_000;

export async function readJson<T>(request: Request): Promise<T> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    throw new HttpError(415, "bad_request", "expected a JSON body.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "too_large", "request body is too large.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "bad_request", "invalid JSON.");
  }
}

export function cookies(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/** Rejects cross-site requests: the browser's Origin must match the host serving the API. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new HttpError(403, "cross_site", "cross-site request blocked.");
  }
  if (origin) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      // fall through to the rejection below
    }
    if (originHost !== host) throw new HttpError(403, "cross_site", "cross-site request blocked.");
  }
}
