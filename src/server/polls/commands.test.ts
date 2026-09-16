import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Connection } from "@/db/connect";
import { ballots, polls, votes } from "@/db/schema";
import { SAMPLE_CREATOR_ID } from "@/db/seed";
import { isPollRuleError, type PollRuleCode } from "@/domain/errors";
import { UNDO_WINDOW_MS } from "@/domain/rules";
import { createTestDb, minutes, NOW, optionIds, reseed, voter } from "@/test/db";
import {
  approveSuggestion,
  castBallot,
  createPoll,
  declineSuggestion,
  endVoting,
  reopenVoting,
  suggestOption,
  undoModeration,
} from "./commands";
import { getCreatorPollView } from "./views";

let connection: Connection;
const db = () => connection.db;
const owner = { slug: "pizza-night", creatorId: SAMPLE_CREATOR_ID };

async function expectRule(promise: Promise<unknown>, code: PollRuleCode) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(isPollRuleError(error, code), `expected ${code}, got ${String(error)}`).toBe(true);
}

async function ballotCount(slug: string) {
  const [{ value }] = await db()
    .select({ value: count() })
    .from(ballots)
    .innerJoin(polls, eq(ballots.pollId, polls.id))
    .where(eq(polls.slug, slug));
  return value;
}

beforeAll(async () => {
  connection = await createTestDb();
});
beforeEach(() => reseed(connection));
afterAll(() => connection.close());

describe("createPoll", () => {
  const valid = {
    title: "  Friday takeaway  ",
    options: ["Thai", "Pizza", "Burgers"],
    closesAt: minutes(120),
    voteType: "single" as const,
    suggestionsEnabled: true,
  };

  it("creates an open poll with its options in order and an unguessable slug", async () => {
    const { slug } = await createPoll(db(), SAMPLE_CREATOR_ID, valid, NOW);
    const view = await getCreatorPollView(db(), slug, { creatorId: SAMPLE_CREATOR_ID, now: NOW });

    expect(slug).toMatch(/^[A-Za-z0-9_-]{14}$/);
    expect(view).toMatchObject({ title: "Friday takeaway", status: "open", maxChoices: 1, totalVotes: 0 });
    expect(view!.options.map((option) => option.label)).toEqual(["Thai", "Pizza", "Burgers"]);
  });

  it("validates options, closing time and pick-up-to-N", async () => {
    await expectRule(createPoll(db(), "c", { ...valid, options: ["Only one"] }, NOW), "INVALID_INPUT");
    await expectRule(createPoll(db(), "c", { ...valid, options: ["Thai", " thai "] }, NOW), "DUPLICATE_OPTION");
    await expectRule(createPoll(db(), "c", { ...valid, closesAt: minutes(-1) }, NOW), "CLOSING_TIME_INVALID");
    await expectRule(createPoll(db(), "c", { ...valid, voteType: "multi", maxChoices: 4 }, NOW), "INVALID_INPUT");
  });
});

describe("castBallot", () => {
  it("records a vote", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const result = await castBallot(db(), "pizza-night", { ...voter("Rosa"), optionIds: [ids["Margherita from Lupa"]] }, NOW);

    expect(result.replayed).toBe(false);
    expect(await ballotCount("pizza-night")).toBe(12);
  });

  it("is idempotent: the same ballot submitted twice counts once", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const ballot = { ...voter("Rosa"), optionIds: [ids["Margherita from Lupa"]] };

    const first = await castBallot(db(), "pizza-night", ballot, NOW);
    const second = await castBallot(db(), "pizza-night", ballot, minutes(1));

    expect(second).toEqual({ ...first, replayed: true });
    expect(await ballotCount("pizza-night")).toBe(12);
  });

  it("returns the recorded ballot to a retry that arrives after voting ended", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const ballot = { ...voter("Rosa"), optionIds: [ids["Margherita from Lupa"]] };
    await castBallot(db(), "pizza-night", ballot, NOW);
    await endVoting(db(), owner, minutes(1));

    await expect(castBallot(db(), "pizza-night", ballot, minutes(2))).resolves.toMatchObject({ replayed: true });
  });

  it("refuses a second, different ballot from the same browser: no takebacks", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const rosa = voter("Rosa");
    await castBallot(db(), "pizza-night", { ...rosa, optionIds: [ids["Margherita from Lupa"]] }, NOW);

    await expectRule(
      castBallot(db(), "pizza-night", { ...rosa, ballotId: crypto.randomUUID(), optionIds: [ids["Pepperoni from Slice House"]] }, NOW),
      "ALREADY_VOTED",
    );
  });

  it("refuses a ballot id that belongs to someone else's vote", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const rosa = voter("Rosa");
    await castBallot(db(), "pizza-night", { ...rosa, optionIds: [ids["Margherita from Lupa"]] }, NOW);

    await expectRule(
      castBallot(db(), "pizza-night", { ...voter("Mallory"), ballotId: rosa.ballotId, optionIds: [ids["Margherita from Lupa"]] }, NOW),
      "BALLOT_ID_CONFLICT",
    );
  });

  it("refuses votes once the poll has settled, whether ended early or past its deadline", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const choice = [ids["Margherita from Lupa"]];

    await expectRule(castBallot(db(), "pizza-night", { ...voter("Late"), optionIds: choice }, minutes(3 * 60)), "POLL_SETTLED");

    await endVoting(db(), owner, NOW);
    await expectRule(castBallot(db(), "pizza-night", { ...voter("Later"), optionIds: choice }, minutes(1)), "POLL_SETTLED");
  });

  it("refuses pending suggestions, options from another poll, and too many choices", async () => {
    const pizza = await optionIds(connection, "pizza-night");
    const brunch = await optionIds(connection, "birthday-brunch");

    await expectRule(castBallot(db(), "pizza-night", { ...voter("A"), optionIds: [pizza["Just order salads"]] }, NOW), "INVALID_CHOICE");
    await expectRule(castBallot(db(), "pizza-night", { ...voter("B"), optionIds: [brunch["The Marlowe"]] }, NOW), "INVALID_CHOICE");
    await expectRule(
      castBallot(db(), "pizza-night", { ...voter("C"), optionIds: [pizza["Margherita from Lupa"], pizza["Pepperoni from Slice House"]] }, NOW),
      "INVALID_CHOICE",
    );
  });

  it("accepts up to N choices on a multi poll as one ballot", async () => {
    const ids = await optionIds(connection, "birthday-brunch");
    await castBallot(db(), "birthday-brunch", { ...voter("Ada"), optionIds: [ids["The Marlowe"], ids["Franca's on the corner"]] }, NOW);

    const [{ value }] = await db()
      .select({ value: count() })
      .from(votes)
      .innerJoin(ballots, eq(votes.ballotId, ballots.id))
      .innerJoin(polls, eq(ballots.pollId, polls.id))
      .where(eq(polls.slug, "birthday-brunch"));
    expect(await ballotCount("birthday-brunch")).toBe(1);
    expect(value).toBe(2);
  });

  it("rejects malformed input before touching the database", async () => {
    await expectRule(
      castBallot(db(), "pizza-night", { ballotId: "not-a-uuid", voterToken: "short", voter: { name: "", avatar: { seed: "x", tint: "cbe2d8" } }, optionIds: [] }, NOW),
      "INVALID_INPUT",
    );
  });

  it("reports a missing poll", async () => {
    await expectRule(castBallot(db(), "nope", { ...voter("A"), optionIds: [crypto.randomUUID()] }, NOW), "POLL_NOT_FOUND");
  });
});

describe("suggestions", () => {
  const sam = { name: "Sam", avatar: { seed: "Sam", tint: "f6e0a4" as const } };

  it("adds a pending suggestion that isn't on the ballot yet", async () => {
    const { id } = await suggestOption(db(), "pizza-night", { label: "Calzones", suggestedBy: sam }, NOW);
    const view = await getCreatorPollView(db(), "pizza-night", { creatorId: SAMPLE_CREATOR_ID, now: NOW });

    expect(view!.pendingSuggestions.map((s) => s.id)).toContain(id);
    expect(view!.options.map((o) => o.id)).not.toContain(id);
  });

  it("refuses suggestions when disabled, when settled, or duplicating a live option", async () => {
    const { slug: fixed } = await createPoll(
      db(),
      SAMPLE_CREATOR_ID,
      { title: "Dates only", options: ["Fri", "Sat"], closesAt: minutes(60), voteType: "single", suggestionsEnabled: false },
      NOW,
    );
    await expectRule(suggestOption(db(), fixed, { label: "Sun", suggestedBy: sam }, NOW), "SUGGESTIONS_DISABLED");
    await expectRule(suggestOption(db(), "meal-out", { label: "Sunday", suggestedBy: sam }, NOW), "POLL_SETTLED");
    await expectRule(suggestOption(db(), "pizza-night", { label: "just ORDER salads", suggestedBy: sam }, NOW), "DUPLICATE_OPTION");
  });

  it("approves a suggestion onto the ballot with 0 votes", async () => {
    const ids = await optionIds(connection, "pizza-night");
    await approveSuggestion(db(), { ...owner, optionId: ids["Just order salads"] }, NOW);
    const view = await getCreatorPollView(db(), "pizza-night", { creatorId: SAMPLE_CREATOR_ID, now: NOW });

    expect(view!.options.find((o) => o.label === "Just order salads")).toMatchObject({ votes: 0, suggestedBy: { name: "Sam" } });
    expect(view!.pendingSuggestions).toEqual([]);
  });

  it("refuses to approve an already-declined suggestion", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const target = { ...owner, optionId: ids["Just order salads"] };
    await declineSuggestion(db(), target, NOW);
    await expectRule(approveSuggestion(db(), target, NOW), "SUGGESTION_ALREADY_DECIDED");
  });

  it("undoes a decline within the window, and not after", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const target = { ...owner, optionId: ids["Just order salads"] };

    await declineSuggestion(db(), target, NOW);
    await expect(undoModeration(db(), target, minutes(1))).resolves.toMatchObject({ status: "pending" });

    await declineSuggestion(db(), target, minutes(2));
    await expectRule(undoModeration(db(), target, new Date(minutes(2).getTime() + UNDO_WINDOW_MS + 1)), "UNDO_UNAVAILABLE");
  });

  it("won't pull an approved option off the ballot once someone voted for it", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const target = { ...owner, optionId: ids["Just order salads"] };
    await approveSuggestion(db(), target, NOW);
    await castBallot(db(), "pizza-night", { ...voter("Kai"), optionIds: [target.optionId] }, minutes(1));

    await expectRule(undoModeration(db(), target, minutes(2)), "UNDO_UNAVAILABLE");
  });

  it("only lets the poll's creator moderate", async () => {
    const ids = await optionIds(connection, "pizza-night");
    await expectRule(
      approveSuggestion(db(), { slug: "pizza-night", creatorId: "someone-else", optionId: ids["Just order salads"] }, NOW),
      "POLL_NOT_FOUND",
    );
  });

  it("refuses moderation once voting has ended", async () => {
    const ids = await optionIds(connection, "pizza-night");
    await endVoting(db(), owner, NOW);
    await expectRule(approveSuggestion(db(), { ...owner, optionId: ids["Just order salads"] }, minutes(1)), "POLL_SETTLED");
  });
});

describe("ending and reopening voting", () => {
  it("ends early, then reopens with a new closing time", async () => {
    await endVoting(db(), owner, NOW);
    let view = await getCreatorPollView(db(), "pizza-night", { creatorId: SAMPLE_CREATOR_ID, now: minutes(1) });
    expect(view).toMatchObject({ status: "settled", endedEarly: true, settledAt: NOW.toISOString() });

    await reopenVoting(db(), { ...owner, closesAt: minutes(60) }, minutes(1));
    view = await getCreatorPollView(db(), "pizza-night", { creatorId: SAMPLE_CREATOR_ID, now: minutes(2) });
    expect(view).toMatchObject({ status: "open", settledAt: null, closesAt: minutes(60).toISOString() });
  });

  it("refuses to end twice, reopen an open poll, or act on someone else's poll", async () => {
    await endVoting(db(), owner, NOW);
    await expectRule(endVoting(db(), owner, minutes(1)), "POLL_SETTLED");
    await expectRule(reopenVoting(db(), { slug: "friday-film-club", creatorId: SAMPLE_CREATOR_ID, closesAt: minutes(60) }, NOW), "POLL_ALREADY_OPEN");
    await expectRule(endVoting(db(), { slug: "friday-film-club", creatorId: "someone-else" }, NOW), "POLL_NOT_FOUND");
  });
});
