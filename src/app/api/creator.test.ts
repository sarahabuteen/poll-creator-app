import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "@/db/connect";
import { SAMPLE_CREATOR_EMAIL, seedSampleData } from "@/db/seed";
import type { ApiErrorBody } from "@/domain/errors";
import type { CreatorPollView } from "@/domain/views";
import { createTestDb, optionIds } from "@/test/db";

// Route handlers and Better Auth both call getDb(); point it at an in-memory test database.
const holder = vi.hoisted(() => ({ connection: undefined as Connection | undefined }));
vi.mock("@/db/client", () => ({ getDb: () => holder.connection!.db }));

const auth = await import("./auth/[...all]/route");
const { GET: listPolls, POST: createPoll } = await import("./creator/polls/route");
const { GET: getCreatorPoll } = await import("./creator/polls/[slug]/route");
const { POST: moderate } = await import("./creator/polls/[slug]/suggestions/[optionId]/[action]/route");
const { POST: endVoting } = await import("./creator/polls/[slug]/end/route");

const ORIGIN = "http://localhost:3000";
const SAMPLE_PASSWORD = "sample-password-for-tests";
const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });

function request(path: string, { body, cookie, ifNoneMatch }: { body?: unknown; cookie?: string; ifNoneMatch?: string } = {}) {
  return new NextRequest(`${ORIGIN}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      ...(cookie ? { cookie } : {}),
      ...(ifNoneMatch ? { "if-none-match": ifNoneMatch } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Turns a Set-Cookie response into the Cookie header a browser would send back. */
function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function signUp(email: string, name = "Casey") {
  const response = await auth.POST(request("/api/auth/sign-up/email", { body: { name, email, password: "a-strong-password" } }));
  expect(response.status).toBe(200);
  return cookieFrom(response);
}

async function logInAsSampleCreator() {
  const response = await auth.POST(
    request("/api/auth/sign-in/email", { body: { email: SAMPLE_CREATOR_EMAIL, password: SAMPLE_PASSWORD } }),
  );
  expect(response.status).toBe(200);
  return cookieFrom(response);
}

const closesAt = () => new Date(Date.now() + 2 * 60 * 60_000).toISOString();

beforeAll(async () => {
  holder.connection = await createTestDb();
});
beforeEach(() => seedSampleData(holder.connection!.db, { samplePassword: SAMPLE_PASSWORD }));
afterAll(() => holder.connection!.close());

describe("auth API", () => {
  it("signs up with a session cookie, and reports the session back", async () => {
    const cookie = await signUp("casey@example.com");
    expect(cookie).toContain("tiebreak.session_token=");

    const session = await (await auth.GET(request("/api/auth/get-session", { cookie }))).json();
    expect(session.user).toMatchObject({ name: "Casey", email: "casey@example.com" });
  });

  it("refuses a duplicate email and a wrong password", async () => {
    await signUp("dup@example.com");
    const duplicate = await auth.POST(
      request("/api/auth/sign-up/email", { body: { name: "Dup", email: "dup@example.com", password: "a-strong-password" } }),
    );
    expect(duplicate.status).toBe(422);

    const wrong = await auth.POST(request("/api/auth/sign-in/email", { body: { email: "dup@example.com", password: "not-it-at-all" } }));
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  it("stores only a password hash", async () => {
    await signUp("hash@example.com");
    const { accounts } = await import("@/db/schema");
    const rows = await holder.connection!.db.select({ password: accounts.password }).from(accounts);
    expect(rows.every((row) => row.password === null || !row.password.includes("a-strong-password"))).toBe(true);
  });

  it("logs out: the old cookie no longer opens creator endpoints", async () => {
    const cookie = await logInAsSampleCreator();
    expect((await getCreatorPoll(request("/api/creator/polls/pizza-night", { cookie }), ctx({ slug: "pizza-night" }))).status).toBe(200);

    const out = await auth.POST(request("/api/auth/sign-out", { body: {}, cookie }));
    expect(out.status).toBe(200);
    expect((await getCreatorPoll(request("/api/creator/polls/pizza-night", { cookie }), ctx({ slug: "pizza-night" }))).status).toBe(401);
  });
});

describe("creator endpoints", () => {
  it("require a signed-in creator", async () => {
    const response = await getCreatorPoll(request("/api/creator/polls/pizza-night"), ctx({ slug: "pizza-night" }));
    expect(response.status).toBe(401);
    expect(((await response.json()) as ApiErrorBody).error.code).toBe("UNAUTHENTICATED");

    const forged = await getCreatorPoll(
      request("/api/creator/polls/pizza-night", { cookie: "tiebreak.session_token=forged.value" }),
      ctx({ slug: "pizza-night" }),
    );
    expect(forged.status).toBe(401);
  });

  it("list only the signed-in creator's polls for the dashboard", async () => {
    expect((await listPolls(request("/api/creator/polls"))).status).toBe(401);

    const sample = await (await listPolls(request("/api/creator/polls", { cookie: await logInAsSampleCreator() }))).json();
    expect(sample.polls.map((poll: { slug: string }) => poll.slug).sort()).toEqual(
      ["birthday-brunch", "friday-film-club", "lake-weekend", "meal-out", "pizza-night"],
    );

    const newcomer = await listPolls(request("/api/creator/polls", { cookie: await signUp("dashboard-new@example.com") }));
    expect(newcomer.headers.get("cache-control")).toBe("no-store");
    expect(await newcomer.json()).toEqual({ polls: [] });
  });

  it("hide other creators' polls as not found, and refuse to act on them", async () => {
    const cookie = await signUp("stranger@example.com");
    const view = await getCreatorPoll(request("/api/creator/polls/pizza-night", { cookie }), ctx({ slug: "pizza-night" }));
    const end = await endVoting(request("/api/creator/polls/pizza-night/end", { body: {}, cookie }), ctx({ slug: "pizza-night" }));
    expect([view.status, end.status]).toEqual([404, 404]);
  });

  it("let a new creator make a poll and manage it", async () => {
    const cookie = await signUp("maker@example.com", "Maker");
    const created = await createPoll(
      request("/api/creator/polls", {
        body: { title: "Friday takeaway", options: ["Thai", "Pizza"], closesAt: closesAt(), voteType: "single", suggestionsEnabled: true },
        cookie,
      }),
    );
    expect(created.status).toBe(201);
    const { slug } = (await created.json()) as { slug: string };

    const view = (await (await getCreatorPoll(request(`/api/creator/polls/${slug}`, { cookie }), ctx({ slug }))).json()) as CreatorPollView;
    expect(view).toMatchObject({ title: "Friday takeaway", status: "open", pendingSuggestions: [] });

    const ended = await endVoting(request(`/api/creator/polls/${slug}/end`, { body: {}, cookie }), ctx({ slug }));
    expect(ended.status).toBe(200);
  });

  it("answer 304 to the owner's poll while unchanged, and 200 after moderation", async () => {
    const cookie = await logInAsSampleCreator();
    const first = await getCreatorPoll(request("/api/creator/polls/pizza-night", { cookie }), ctx({ slug: "pizza-night" }));
    const etag = first.headers.get("etag")!;
    expect(first.headers.get("cache-control")).toBe("private, no-cache");
    expect(first.headers.get("vary")).toBe("Cookie");

    const unchanged = await getCreatorPoll(request("/api/creator/polls/pizza-night", { cookie, ifNoneMatch: etag }), ctx({ slug: "pizza-night" }));
    expect(unchanged.status).toBe(304);

    const optionId = (await optionIds(holder.connection!, "pizza-night"))["Just order salads"];
    await moderate(request("/x", { body: {}, cookie }), ctx({ slug: "pizza-night", optionId, action: "approve" }));

    const changed = await getCreatorPoll(request("/api/creator/polls/pizza-night", { cookie, ifNoneMatch: etag }), ctx({ slug: "pizza-night" }));
    expect(changed.status).toBe(200);
    expect(((await changed.json()) as CreatorPollView).pendingSuggestions).toEqual([]);
  });

  it("never answer 304 to someone who isn't the owner, even with the right tag", async () => {
    const owner = await logInAsSampleCreator();
    const etag = (await getCreatorPoll(request("/api/creator/polls/pizza-night", { cookie: owner }), ctx({ slug: "pizza-night" }))).headers.get("etag")!;

    const signedOut = await getCreatorPoll(request("/api/creator/polls/pizza-night", { ifNoneMatch: etag }), ctx({ slug: "pizza-night" }));
    const stranger = await getCreatorPoll(
      request("/api/creator/polls/pizza-night", { cookie: await signUp("etag-stranger@example.com"), ifNoneMatch: etag }),
      ctx({ slug: "pizza-night" }),
    );
    expect([signedOut.status, stranger.status]).toEqual([401, 404]);
  });

  it("moderate suggestions for the owner, and refuse unknown actions or ids as 404", async () => {
    const cookie = await logInAsSampleCreator();
    const optionId = (await optionIds(holder.connection!, "pizza-night"))["Just order salads"];

    const approved = await moderate(request("/x", { body: {}, cookie }), ctx({ slug: "pizza-night", optionId, action: "approve" }));
    expect(await approved.json()).toEqual({ optionId, status: "approved" });

    const twice = await moderate(request("/x", { body: {}, cookie }), ctx({ slug: "pizza-night", optionId, action: "decline" }));
    const unknown = await moderate(request("/x", { body: {}, cookie }), ctx({ slug: "pizza-night", optionId, action: "delete" }));
    const badId = await moderate(request("/x", { body: {}, cookie }), ctx({ slug: "pizza-night", optionId: "nope", action: "approve" }));
    expect([twice.status, unknown.status, badId.status]).toEqual([409, 404, 404]);
  });
});
