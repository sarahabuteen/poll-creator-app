import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Connection } from "@/db/connect";
import { SAMPLE_CREATOR_ID } from "@/db/seed";
import { createTestDb, minutes, NOW, optionIds, reseed, voter } from "@/test/db";
import { castBallot, declineSuggestion, endVoting } from "./commands";
import { getCreatorPollView, getPublicPollView } from "./views";

let connection: Connection;
const db = () => connection.db;

beforeAll(async () => {
  connection = await createTestDb();
});
beforeEach(() => reseed(connection));
afterAll(() => connection.close());

describe("while a poll is open", () => {
  it("returns counts for ballot options only, matching the preview", async () => {
    const view = await getPublicPollView(db(), "pizza-night", { now: NOW });

    expect(view).toMatchObject({ status: "open", totalVotes: 11, endedEarly: false, settledAt: null });
    expect(view!.options.map((o) => [o.label, o.votes])).toEqual([
      ["Detroit-style from Emmy's", 5],
      ["Pepperoni from Slice House", 3],
      ["Veggie supreme from Nino's", 2],
      ["Margherita from Lupa", 1],
    ]);
  });

  it("never links a voter to an option, in any form", async () => {
    const view = await getPublicPollView(db(), "pizza-night", { now: NOW });

    expect(view!.options.every((o) => o.backers === null)).toBe(true);
    expect(view!.voters).toHaveLength(11);
    for (const voter of view!.voters) {
      expect(Object.keys(voter).sort()).toEqual(["avatar", "castAt", "name"]);
    }
    // Belt and braces: nothing in the payload identifies a ballot.
    expect(JSON.stringify(view)).not.toMatch(/voterToken|vt-|ballotId|optionId/);
  });

  it("hides pending and declined suggestions from the public ballot", async () => {
    const ids = await optionIds(connection, "pizza-night");
    await declineSuggestion(db(), { slug: "pizza-night", creatorId: SAMPLE_CREATOR_ID, optionId: ids["Just order salads"] }, NOW);

    const view = await getPublicPollView(db(), "pizza-night", { now: NOW });
    expect(view!.options.map((o) => o.label)).not.toContain("Just order salads");
    expect(view).not.toHaveProperty("pendingSuggestions");
  });

  it("shows a returning voter their own ballot, and only theirs", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const rosa = voter("Rosa");
    await castBallot(db(), "pizza-night", { ...rosa, optionIds: [ids["Margherita from Lupa"]] }, NOW);

    const mine = await getPublicPollView(db(), "pizza-night", { voterToken: rosa.voterToken, now: minutes(1) });
    const stranger = await getPublicPollView(db(), "pizza-night", { voterToken: "someone-else-entirely", now: minutes(1) });

    expect(mine!.viewerBallot).toEqual({ optionIds: [ids["Margherita from Lupa"]], castAt: NOW.toISOString() });
    expect(stranger!.viewerBallot).toBeNull();
  });
});

describe("once a poll settles", () => {
  it("settles at its closing time with no write, and reveals who backed what", async () => {
    // Pizza night closes 3 hours after the seeded "now".
    const view = await getPublicPollView(db(), "pizza-night", { now: minutes(3 * 60) });

    expect(view).toMatchObject({ status: "settled", endedEarly: false, settledAt: minutes(3 * 60).toISOString() });
    expect(view!.options[0].backers!.map((p) => p.name)).toEqual(["Priya", "Ada", "Kai", "Noor", "Theo"]);
    expect(view!.options.reduce((sum, o) => sum + o.backers!.length, 0)).toBe(11);
  });

  it("reports an early end", async () => {
    await endVoting(db(), { slug: "friday-film-club", creatorId: SAMPLE_CREATOR_ID }, NOW);
    const view = await getPublicPollView(db(), "friday-film-club", { now: minutes(1) });
    expect(view).toMatchObject({ status: "settled", endedEarly: true });
    expect(view!.options.every((o) => Array.isArray(o.backers))).toBe(true);
  });
});

describe("creator view", () => {
  it("adds pending suggestions for the owner", async () => {
    const view = await getCreatorPollView(db(), "pizza-night", { creatorId: SAMPLE_CREATOR_ID, now: NOW });
    expect(view!.pendingSuggestions).toEqual([
      expect.objectContaining({ label: "Just order salads", suggestedBy: { name: "Sam", avatar: { seed: "Sam", tint: "f6e0a4" } } }),
    ]);
  });

  it("is invisible to anyone else", async () => {
    expect(await getCreatorPollView(db(), "pizza-night", { creatorId: "someone-else", now: NOW })).toBeNull();
  });

  it("lists decisions that can still be undone, until the window closes", async () => {
    const ids = await optionIds(connection, "pizza-night");
    await declineSuggestion(db(), { slug: "pizza-night", creatorId: SAMPLE_CREATOR_ID, optionId: ids["Just order salads"] }, NOW);

    const soon = await getCreatorPollView(db(), "pizza-night", { creatorId: SAMPLE_CREATOR_ID, now: minutes(1) });
    const later = await getCreatorPollView(db(), "pizza-night", { creatorId: SAMPLE_CREATOR_ID, now: minutes(11) });

    expect(soon!.undoableDecisions).toEqual([
      expect.objectContaining({ label: "Just order salads", decision: "declined", undoUntil: minutes(10).toISOString() }),
    ]);
    expect(later!.undoableDecisions).toEqual([]);
  });

  it("returns null for an unknown poll", async () => {
    expect(await getPublicPollView(db(), "nope", { now: NOW })).toBeNull();
  });
});
