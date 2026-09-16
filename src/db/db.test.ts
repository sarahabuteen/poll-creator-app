import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, type Connection } from "./connect";
import { runMigrations } from "./migrate";
import { getPollBySlug } from "./queries";
import { ballots, options, polls, votes } from "./schema";
import { SAMPLE_NOW, seedSampleData } from "./seed";

const NOW = Date.parse("2030-01-01T12:00:00Z");
let connection: Connection;

beforeAll(async () => {
  // Empty data dir = in-memory PGlite, fresh for this file.
  connection = connect({ DATABASE_URL: undefined, PGLITE_DATA_DIR: "" });
  await runMigrations(connection);
  await seedSampleData(connection.db, NOW);
});

afterAll(() => connection.close());

describe("seeded sample data", () => {
  it("loads pizza night in the shape the UI renders", async () => {
    const poll = await getPollBySlug(connection.db, "pizza-night");

    expect(poll).not.toBeNull();
    expect(poll!.votes).toHaveLength(11);
    expect(poll!.options.map((option) => option.label)).toEqual([
      "Detroit-style from Emmy's",
      "Pepperoni from Slice House",
      "Veggie supreme from Nino's",
      "Margherita from Lupa",
      "Just order salads",
    ]);
    expect(poll!.options.at(-1)).toMatchObject({
      source: "suggestion",
      suggestionStatus: "pending",
      suggestedBy: { name: "Sam", avatar: { seed: "Sam", tint: "f6e0a4" } },
    });
  });

  it("shifts timestamps so the sample's distance from 'now' is kept", async () => {
    const poll = await getPollBySlug(connection.db, "pizza-night");
    const closesIn = Date.parse(poll!.closesAt) - NOW;
    expect(closesIn).toBe(Date.parse("2026-09-17T18:00:00Z") - SAMPLE_NOW);
  });

  it("groups the multi-choice sample into one ballot per voter token", async () => {
    const [{ value: ballotCount }] = await connection.db.select({ value: count() }).from(ballots);
    const [{ value: voteCount }] = await connection.db.select({ value: count() }).from(votes);
    expect(ballotCount).toBe(32);
    expect(voteCount).toBe(32);
  });

  it("can be re-seeded without duplicating polls", async () => {
    await seedSampleData(connection.db, NOW);
    const [{ value }] = await connection.db.select({ value: count() }).from(polls);
    expect(value).toBe(5);
  });

  it("returns null for an unknown slug", async () => {
    expect(await getPollBySlug(connection.db, "nope")).toBeNull();
  });
});

describe("schema constraints", () => {
  async function pizzaNight() {
    const [poll] = await connection.db.select().from(polls).where(eq(polls.slug, "pizza-night"));
    return poll;
  }

  it("rejects a second ballot from the same voter token on a poll", async () => {
    const poll = await pizzaNight();
    await expect(
      connection.db.insert(ballots).values({
        id: crypto.randomUUID(),
        pollId: poll.id,
        voterToken: "vt-priya-01",
        voterName: "Priya again",
        avatarSeed: "Priya",
        avatarTint: "f8c9b9",
      }),
    ).rejects.toThrow();
  });

  it("rejects a suggestion without a status or suggester", async () => {
    const poll = await pizzaNight();
    await expect(
      connection.db.insert(options).values({ pollId: poll.id, label: "Mystery", position: 9, source: "suggestion" }),
    ).rejects.toThrow();
  });

  it("deletes options, ballots and votes with their poll", async () => {
    const poll = await pizzaNight();
    await connection.db.delete(polls).where(eq(polls.id, poll.id));

    const [{ value: orphanOptions }] = await connection.db
      .select({ value: count() })
      .from(options)
      .where(eq(options.pollId, poll.id));
    const [{ value: orphanBallots }] = await connection.db
      .select({ value: count() })
      .from(ballots)
      .where(eq(ballots.pollId, poll.id));
    const [{ value: remainingVotes }] = await connection.db.select({ value: count() }).from(votes);

    expect(orphanOptions).toBe(0);
    expect(orphanBallots).toBe(0);
    expect(remainingVotes).toBe(32 - 11);
  });
});
