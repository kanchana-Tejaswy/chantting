import { NextResponse } from "next/server";

export const PRIVATE_NO_STORE_HEADERS: Readonly<Record<string, string>> = {
  "Cache-Control": "no-store, private",
};

interface RateLimitEntry {
  timestamps: number[];
  expiresAt: number;
}

const MAX_STORE_ENTRIES = 10_000;
const store = new Map<string, RateLimitEntry>();

export interface RateLimitCheckOptions {
  bucket: string;
  identifier: string;
  limit: number;
  windowMs: number;
  now?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

function pruneExpired(now: number) {
  if (store.size < MAX_STORE_ENTRIES) return;
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
  if (store.size >= MAX_STORE_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) store.delete(oldestKey);
  }
}

export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "anonymous-client";
}

export function consumeRateLimit({
  bucket,
  identifier,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitCheckOptions): RateLimitResult {
  const key = `${bucket}:${identifier}`;
  const windowStart = now - windowMs;
  const existing = store.get(key);
  const recent = (existing?.timestamps ?? []).filter((ts) => ts > windowStart);

  if (recent.length >= limit) {
    const oldestInWindow = recent[0] ?? now;
    const retryMs = Math.max(oldestInWindow + windowMs - now, 1000);
    store.set(key, {
      timestamps: recent,
      expiresAt: oldestInWindow + windowMs,
    });
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryMs / 1000),
    };
  }

  pruneExpired(now);
  recent.push(now);
  store.set(key, {
    timestamps: recent,
    expiresAt: now + windowMs,
  });

  return {
    allowed: true,
    limit,
    remaining: Math.max(limit - recent.length, 0),
    retryAfterSeconds: 0,
  };
}

export function enforceApiRateLimit(options: {
  request: Request;
  bucket: string;
  userId?: string;
  limit: number;
  windowMs: number;
}): NextResponse | null {
  const identifier = options.userId || extractClientIp(options.request);
  const result = consumeRateLimit({
    bucket: options.bucket,
    identifier,
    limit: options.limit,
    windowMs: options.windowMs,
  });

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Too many requests. Please pause briefly and try again.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

export function resetRateLimitStore(): void {
  store.clear();
}

