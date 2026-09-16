import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import type { Db } from "@/db/connect";
import { rateLimits } from "@/db/schema";
import { env } from "@/lib/env";
import { ApiError } from "./http";

export type Limit = {
  /** Who is being counted. */
  by: "voter" | "ip";
  max: number;
  windowMs: number;
};

const TEN_MINUTES = 10 * 60_000;

/**
 * Generous on purpose: a whole group can share one IP on the same Wi-Fi, and a
 * flaky connection retries. These stop floods, not friends.
 */
export const CAST_LIMITS: Limit[] = [
  { by: "voter", max: 10, windowMs: TEN_MINUTES },
  { by: "ip", max: 60, windowMs: TEN_MINUTES },
];

export const SUGGEST_LIMITS: Limit[] = [
  { by: "voter", max: 6, windowMs: TEN_MINUTES },
  { by: "ip", max: 30, windowMs: TEN_MINUTES },
];

/** Vercel sets x-forwarded-for itself, so its first entry is the client. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/** IPs are personal data: counters only ever see a salted hash. */
function hashSubject(value: string): string {
  const salt = env().BETTER_AUTH_SECRET ?? "tiebreak-local-rate-limit-salt";
  return createHash("sha256").update(`${salt}:${value}`).digest("base64url").slice(0, 32);
}

export type LimitResult = { allowed: boolean; count: number; retryAfterSeconds: number };

/**
 * Counts one hit against a fixed window, atomically: a single upsert either
 * starts a fresh window or increments the current one.
 */
export async function consume(db: Db, key: string, { max, windowMs }: Pick<Limit, "max" | "windowMs">, now = new Date()): Promise<LimitResult> {
  // Raw SQL params skip Drizzle's column mapping, and the postgres-js driver
  // (Neon) can't serialise a Date there. Send ISO strings with explicit casts.
  const expired = sql`${new Date(now.getTime() - windowMs).toISOString()}::timestamptz`;
  const startedNow = sql`${now.toISOString()}::timestamptz`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStartedAt: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStartedAt} <= ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStartedAt: sql`case when ${rateLimits.windowStartedAt} <= ${expired} then ${startedNow} else ${rateLimits.windowStartedAt} end`,
      },
    })
    .returning({ count: rateLimits.count, windowStartedAt: rateLimits.windowStartedAt });

  const resetsAt = row.windowStartedAt.getTime() + windowMs;
  return {
    allowed: row.count <= max,
    count: row.count,
    retryAfterSeconds: Math.max(1, Math.ceil((resetsAt - now.getTime()) / 1000)),
  };
}

/** Drops counters whose windows ended long ago. Cheap, so it can piggyback on requests. */
export async function pruneRateLimits(db: Db, now = new Date()) {
  await db.delete(rateLimits).where(lt(rateLimits.windowStartedAt, new Date(now.getTime() - 24 * 60 * 60_000)));
}

/** Applies every limit for this request, or throws a 429 with Retry-After. */
export async function enforceRateLimits(
  db: Db,
  request: NextRequest,
  { scope, voterToken, limits, now = new Date() }: { scope: string; voterToken: string; limits: Limit[]; now?: Date },
) {
  let retryAfter = 0;
  for (const limit of limits) {
    const subject = limit.by === "voter" ? voterToken : clientIp(request);
    const result = await consume(db, `${scope}:${limit.by}:${hashSubject(subject)}`, limit, now);
    if (!result.allowed) retryAfter = Math.max(retryAfter, result.retryAfterSeconds);
  }

  // Roughly one request in 50 tidies up old counters.
  if (Math.random() < 0.02) void pruneRateLimits(db, now).catch(() => undefined);

  if (retryAfter > 0) {
    throw new ApiError(429, "RATE_LIMITED", "Too many tries in a short time. Wait a moment, then try again.", {
      "Retry-After": String(retryAfter),
    });
  }
}
