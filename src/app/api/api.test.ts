import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "@/db/connect";
import type { ApiErrorBody } from "@/domain/errors";
import type { PublicPollView } from "@/domain/views";
import { seedSampleData } from "@/db/seed";
import { createTestDb, optionIds } from "@/test/db";

// Public voter endpoints. Creator endpoints and auth are covered in creator.test.ts.
// Route handlers call getDb(); point it at an in-memory test database.
const holder = vi.hoisted(() => ({ connection: undefined as Connection | undefined }));
vi.mock("@/db/client", () => ({ getDb: () => holder.connection!.db }));

const { GET: getPoll } = await import("./polls/[slug]/route");
const { POST: castBallot } = await import("./polls/[slug]/ballots/route");
const { POST: suggest } = await import("./polls/[slug]/suggestions/route");

const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });

function request(path: string, { body, cookie, ifNoneMatch }: { body?: unknown; cookie?: string; ifNoneMatch?: string } = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(ifNoneMatch ? { "if-none-match": ifNoneMatch } : {}),
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

const rosa = { name: "Rosa", avatar: { seed: "Rosa", tint: "cbe2d8" } };

beforeAll(async () => {
  holder.connection = await createTestDb();
});
// Route handlers use the real clock, so seed relative to it: open sample polls are genuinely open.
beforeEach(() => seedSampleData(holder.connection!.db));
afterAll(() => holder.connection!.close());

describe("GET /api/polls/:slug", () => {
  it("returns counts with no attribution while open, revalidated on every request", async () => {
    const response = await getPoll(request("/api/polls/pizza-night"), ctx({ slug: "pizza-night" }));
    const view = (await response.json()) as PublicPollView;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
    expect(view.totalVotes).toBe(11);
    expect(view.options.every((option) => option.backers === null)).toBe(true);
    expect(view.viewerBallot).toBeNull();
  });

  it("answers 304 while the caller's copy is current, and 200 once a vote lands", async () => {
    const first = await getPoll(request("/api/polls/pizza-night"), ctx({ slug: "pizza-night" }));
    const etag = first.headers.get("etag")!;
    expect(etag).toMatch(/^W\//);
    expect(first.headers.get("cache-control")).toBe("private, no-cache");

    const unchanged = await getPoll(request("/api/polls/pizza-night", { ifNoneMatch: etag }), ctx({ slug: "pizza-night" }));
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");

    const ids = await optionIds(holder.connection!, "pizza-night");
    await castBallot(
      request("/api/polls/pizza-night/ballots", { body: { ballotId: crypto.randomUUID(), voter: rosa, optionIds: [ids["Margherita from Lupa"]] } }),
      ctx({ slug: "pizza-night" }),
    );

    const changed = await getPoll(request("/api/polls/pizza-night", { ifNoneMatch: etag }), ctx({ slug: "pizza-night" }));
    expect(changed.status).toBe(200);
    expect(changed.headers.get("etag")).not.toBe(etag);
    expect(((await changed.json()) as PublicPollView).totalVotes).toBe(12);
  });

  it("404s with an error body for an unknown poll", async () => {
    const response = await getPoll(request("/api/polls/nope"), ctx({ slug: "nope" }));
    expect(response.status).toBe(404);
    expect(((await response.json()) as ApiErrorBody).error.code).toBe("POLL_NOT_FOUND");
  });
});

describe("POST /api/polls/:slug/ballots", () => {
  it("records a vote, issues an httpOnly voter cookie, and recognises the voter afterwards", async () => {
    const ids = await optionIds(holder.connection!, "pizza-night");
    const body = { ballotId: crypto.randomUUID(), voter: rosa, optionIds: [ids["Margherita from Lupa"]] };

    const response = await castBallot(request("/api/polls/pizza-night/ballots", { body }), ctx({ slug: "pizza-night" }));
    expect(response.status).toBe(201);

    const cookie = response.cookies.get("tiebreak_voter");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.value.length).toBeGreaterThanOrEqual(32);

    const cookieHeader = `tiebreak_voter=${cookie!.value}`;
    const view = (await (
      await getPoll(request("/api/polls/pizza-night", { cookie: cookieHeader }), ctx({ slug: "pizza-night" }))
    ).json()) as PublicPollView;
    expect(view.viewerBallot?.optionIds).toEqual([ids["Margherita from Lupa"]]);

    // Same ballot again (a refresh or double tap): 200, still one vote.
    const retry = await castBallot(request("/api/polls/pizza-night/ballots", { body, cookie: cookieHeader }), ctx({ slug: "pizza-night" }));
    expect(retry.status).toBe(200);

    // A different ballot from the same browser: refused.
    const again = await castBallot(
      request("/api/polls/pizza-night/ballots", { body: { ...body, ballotId: crypto.randomUUID() }, cookie: cookieHeader }),
      ctx({ slug: "pizza-night" }),
    );
    expect(again.status).toBe(409);
    expect(((await again.json()) as ApiErrorBody).error.code).toBe("ALREADY_VOTED");
  });

  it("ignores a voter token sent in the body", async () => {
    const ids = await optionIds(holder.connection!, "pizza-night");
    const response = await castBallot(
      request("/api/polls/pizza-night/ballots", {
        body: { ballotId: crypto.randomUUID(), voterToken: "vt-priya-01", voter: rosa, optionIds: [ids["Margherita from Lupa"]] },
      }),
      ctx({ slug: "pizza-night" }),
    );
    // Priya's sample token would be ALREADY_VOTED if it were honoured.
    expect(response.status).toBe(201);
  });

  it("maps bad input to 400/422 without a stack trace", async () => {
    const malformed = await castBallot(request("/api/polls/pizza-night/ballots", { body: "{nope" }), ctx({ slug: "pizza-night" }));
    expect(malformed.status).toBe(400);

    const ids = await optionIds(holder.connection!, "pizza-night");
    const pending = await castBallot(
      request("/api/polls/pizza-night/ballots", { body: { ballotId: crypto.randomUUID(), voter: rosa, optionIds: [ids["Just order salads"]] } }),
      ctx({ slug: "pizza-night" }),
    );
    const body = (await pending.json()) as ApiErrorBody;
    expect(pending.status).toBe(422);
    expect(body.error.code).toBe("INVALID_CHOICE");
    expect(JSON.stringify(body)).not.toMatch(/at \w+ \(/);
  });
});

describe("POST /api/polls/:slug/suggestions", () => {
  it("creates a pending suggestion that stays off the public ballot", async () => {
    const created = await suggest(
      request("/api/polls/pizza-night/suggestions", { body: { label: "Calzones", suggestedBy: rosa } }),
      ctx({ slug: "pizza-night" }),
    );
    expect(created.status).toBe(201);

    const publicView = (await (await getPoll(request("/api/polls/pizza-night"), ctx({ slug: "pizza-night" }))).json()) as PublicPollView;
    expect(JSON.stringify(publicView)).not.toContain("Calzones");
  });
});
