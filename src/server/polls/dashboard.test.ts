import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Connection } from "@/db/connect";
import { SAMPLE_CREATOR_ID } from "@/db/seed";
import { createTestDb, minutes, NOW, optionIds, reseed, voter } from "@/test/db";
import { castBallot, createPoll, declineSuggestion, endVoting } from "./commands";
import { listCreatorPolls } from "./dashboard";

let connection: Connection;
const db = () => connection.db;
const bySlug = async (now = NOW) => new Map((await listCreatorPolls(db(), SAMPLE_CREATOR_ID, now)).map((poll) => [poll.slug, poll]));

beforeAll(async () => {
  connection = await createTestDb();
});
beforeEach(() => reseed(connection));
afterAll(() => connection.close());

describe("listCreatorPolls", () => {
  it("summarises every sample poll with counts derived from the votes", async () => {
    const polls = await bySlug();

    expect(polls.get("pizza-night")).toMatchObject({
      status: "open",
      totalVotes: 11,
      voterCount: 11,
      pendingSuggestions: 1,
      leaders: [{ label: "Detroit-style from Emmy's", votes: 5 }],
    });
    expect(polls.get("friday-film-club")).toMatchObject({ status: "open", leaders: [{ label: "Jaws", votes: 3 }] });
    expect(polls.get("meal-out")).toMatchObject({ status: "settled", endedEarly: true, pendingSuggestions: 0, leaders: [{ label: "Thursday 24 September", votes: 4 }] });
    expect(polls.get("lake-weekend")).toMatchObject({ status: "settled", endedEarly: false, leaders: [{ label: "The A-frame cabin", votes: 3 }] });
    expect(polls.get("birthday-brunch")).toMatchObject({ status: "open", totalVotes: 0, voterCount: 0, leaders: [] });
  });

  it("counts voters, not votes, on pick-up-to-N polls", async () => {
    const ids = await optionIds(connection, "birthday-brunch");
    await castBallot(db(), "birthday-brunch", { ...voter("Ada"), optionIds: [ids["The Marlowe"], ids["Franca's on the corner"]] }, NOW);

    expect((await bySlug()).get("birthday-brunch")).toMatchObject({
      totalVotes: 2,
      voterCount: 1,
      leaders: [
        { label: "The Marlowe", votes: 1 },
        { label: "Franca's on the corner", votes: 1 },
      ],
    });
  });

  it("lists every tied leader in ballot order", async () => {
    const ids = await optionIds(connection, "friday-film-club");
    await castBallot(db(), "friday-film-club", { ...voter("Kai"), optionIds: [ids["Heat"]] }, NOW);
    expect((await bySlug()).get("friday-film-club")!.leaders).toEqual([
      { label: "Jaws", votes: 3 },
      { label: "Heat", votes: 3 },
    ]);
  });

  it("keeps undecided and declined suggestions out of the standings", async () => {
    const ids = await optionIds(connection, "pizza-night");
    await declineSuggestion(db(), { slug: "pizza-night", creatorId: SAMPLE_CREATOR_ID, optionId: ids["Just order salads"] }, NOW);
    expect((await bySlug()).get("pizza-night")).toMatchObject({ pendingSuggestions: 0, totalVotes: 11 });
  });

  it("settles polls past their deadline, and drops waiting suggestions from settled polls", async () => {
    // Pizza night closes three hours after the seeded "now".
    expect((await bySlug(minutes(3 * 60))).get("pizza-night")).toMatchObject({ status: "settled", endedEarly: false, pendingSuggestions: 0 });

    await endVoting(db(), { slug: "friday-film-club", creatorId: SAMPLE_CREATOR_ID }, NOW);
    expect((await bySlug(minutes(1))).get("friday-film-club")).toMatchObject({ status: "settled", endedEarly: true });
  });

  it("only returns the creator's own polls", async () => {
    expect(await listCreatorPolls(db(), "someone-else", NOW)).toEqual([]);
  });
});

describe("createPoll slugs", () => {
  const input = { title: "Clash test", options: ["A", "B"], closesAt: minutes(60), voteType: "single" as const, suggestionsEnabled: false };

  it("retries with a fresh slug when one is already taken", async () => {
    const slugs = ["pizza-night", "fresh-slug-001"];
    const created = await createPoll(db(), SAMPLE_CREATOR_ID, input, NOW, { makeSlug: () => slugs.shift()! });
    expect(created.slug).toBe("fresh-slug-001");
  });

  it("gives up after a few clashes rather than looping forever", async () => {
    await expect(createPoll(db(), SAMPLE_CREATOR_ID, input, NOW, { makeSlug: () => "pizza-night" })).rejects.toThrow();
  });
});
