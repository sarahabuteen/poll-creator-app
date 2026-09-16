import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Connection } from "@/db/connect";
import { rateLimits } from "@/db/schema";
import { createTestDb, NOW } from "@/test/db";
import { ApiError } from "./http";
import { clientIp, consume, enforceRateLimits, pruneRateLimits } from "./rate-limit";

let connection: Connection;
const db = () => connection.db;
const at = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);
const limit = { max: 3, windowMs: 60_000 };

beforeAll(async () => {
  connection = await createTestDb();
});
beforeEach(() => connection.db.delete(rateLimits));
afterAll(() => connection.close());

describe("consume", () => {
  it("allows up to the max within a window, then refuses with a retry time", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consume(db(), "k", limit, at(i)));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3]).toMatchObject({ count: 4, retryAfterSeconds: 57 });
  });

  it("starts a fresh window once the old one has passed", async () => {
    for (let i = 0; i < 4; i++) await consume(db(), "k", limit, at(0));
    await expect(consume(db(), "k", limit, at(60))).resolves.toMatchObject({ allowed: true, count: 1 });
  });

  it("counts keys separately", async () => {
    for (let i = 0; i < 4; i++) await consume(db(), "a", limit, at(0));
    await expect(consume(db(), "b", limit, at(0))).resolves.toMatchObject({ allowed: true });
  });

  it("stays exact under concurrent hits", async () => {
    await Promise.all(Array.from({ length: 10 }, () => consume(db(), "burst", { max: 100, windowMs: 60_000 }, at(0))));
    await expect(consume(db(), "burst", { max: 100, windowMs: 60_000 }, at(0))).resolves.toMatchObject({ count: 11 });
  });
});

describe("enforceRateLimits", () => {
  const request = (ip: string) => new NextRequest("http://localhost/api/x", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
  const limits = [
    { by: "voter" as const, max: 2, windowMs: 60_000 },
    { by: "ip" as const, max: 5, windowMs: 60_000 },
  ];

  it("throws a 429 with Retry-After once a limit is hit", async () => {
    const hit = () => enforceRateLimits(db(), request("203.0.113.7"), { scope: "cast:p", voterToken: "voter-1", limits, now: at(0) });
    await hit();
    await hit();
    const error = await hit().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, code: "RATE_LIMITED", headers: { "Retry-After": "60" } });
  });

  it("limits a shared IP separately from each voter, generously", async () => {
    for (let i = 0; i < 5; i++) {
      await enforceRateLimits(db(), request("203.0.113.8"), { scope: "cast:p", voterToken: `voter-${i}`, limits, now: at(0) });
    }
    await expect(
      enforceRateLimits(db(), request("203.0.113.8"), { scope: "cast:p", voterToken: "voter-new", limits, now: at(0) }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("never stores a raw IP address or voter token", async () => {
    await enforceRateLimits(db(), request("198.51.100.23"), { scope: "suggest:p", voterToken: "voter-raw-token", limits, now: at(0) });
    const keys = (await db().select({ key: rateLimits.key }).from(rateLimits)).map((row) => row.key).join(" ");
    expect(keys).not.toContain("198.51.100.23");
    expect(keys).not.toContain("voter-raw-token");
  });

  it("reads the client IP from the first forwarded address", () => {
    expect(clientIp(request("203.0.113.9"))).toBe("203.0.113.9");
    expect(clientIp(new NextRequest("http://localhost/"))).toBe("unknown");
  });
});

describe("pruneRateLimits", () => {
  it("drops counters from windows that ended over a day ago", async () => {
    await consume(db(), "old", limit, at(-2 * 24 * 60 * 60));
    await consume(db(), "fresh", limit, at(0));
    await pruneRateLimits(db(), at(0));
    const keys = (await db().select({ key: rateLimits.key }).from(rateLimits)).map((row) => row.key);
    expect(keys).toEqual(["fresh"]);
  });
});
