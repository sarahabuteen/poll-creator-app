import { describe, expect, it } from "vitest";
import raw from "../../../data/sample-polls.json";
import type { SampleData } from "@/db/sample-types";
import { UNDO_WINDOW_MS } from "@/domain/rules";
import { guestApprove, guestCastBallot, guestDecline, guestEndVoting, guestReopenVoting, guestSuggest, guestUndo } from "./actions";
import { parseStoredGuest } from "./storage";
import { SAMPLE_NOW, shiftSampleData, type GuestPoll } from "./shift";
import { guestCreatorView, guestPublicView, guestSummary } from "./views";

const NOW = new Date("2030-01-01T12:00:00Z");
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
const data = shiftSampleData(raw as SampleData, NOW.getTime());
const poll = (id: string) => data.polls.find((item) => item.id === id)!;
const unwrap = (result: ReturnType<typeof guestApprove>): GuestPoll => {
  if (!result.ok) throw new Error(result.code);
  return result.poll;
};

describe("shiftSampleData", () => {
  it("keeps every timestamp's distance from now", () => {
    expect(Date.parse(poll("pizza-night").closesAt) - NOW.getTime()).toBe(Date.parse("2026-09-17T18:00:00Z") - SAMPLE_NOW);
  });
});

describe("guest views", () => {
  it("match what the real API shows for pizza night", () => {
    const view = guestCreatorView(poll("pizza-night"), NOW);
    expect(view).toMatchObject({ status: "open", totalVotes: 11, slug: "pizza-night" });
    expect(view.voters).toHaveLength(11);
    expect(view.options.map((option) => [option.label, option.votes])).toEqual([
      ["Detroit-style from Emmy's", 5],
      ["Pepperoni from Slice House", 3],
      ["Veggie supreme from Nino's", 2],
      ["Margherita from Lupa", 1],
    ]);
    expect(view.pendingSuggestions.map((suggestion) => suggestion.label)).toEqual(["Just order salads"]);
  });

  it("follow the attribution rule: backers only once settled", () => {
    expect(guestCreatorView(poll("pizza-night"), NOW).options.every((option) => option.backers === null)).toBe(true);
    const mealOut = guestCreatorView(poll("meal-out"), NOW);
    expect(mealOut).toMatchObject({ status: "settled", endedEarly: true });
    expect(mealOut.options[0].backers!.map((person) => person.name)).toEqual(["Priya", "Jonah", "Noor", "Elif"]);
  });

  it("summarise polls for the dashboard", () => {
    expect(guestSummary(poll("birthday-brunch"), NOW)).toMatchObject({ status: "open", totalVotes: 0, voterCount: 0, leaders: [] });
    expect(guestSummary(poll("pizza-night"), NOW)).toMatchObject({ pendingSuggestions: 1, leaders: [{ label: "Detroit-style from Emmy's", votes: 5 }] });
  });
});

describe("guest actions (the real rules, in the browser)", () => {
  it("approve puts the suggestion on the ballot with 0 votes, and undo takes it back", () => {
    const approved = unwrap(guestApprove(poll("pizza-night"), "salads", NOW));
    const view = guestCreatorView(approved, NOW);
    expect(view.options.at(-1)).toMatchObject({ label: "Just order salads", votes: 0 });
    expect(view.undoableDecisions).toEqual([expect.objectContaining({ label: "Just order salads", decision: "approved" })]);

    const undone = unwrap(guestUndo(approved, "salads", at(1)));
    expect(guestCreatorView(undone, at(1)).pendingSuggestions.map((s) => s.id)).toEqual(["salads"]);
  });

  it("refuses what the product refuses", () => {
    const declined = unwrap(guestDecline(poll("pizza-night"), "salads", NOW));
    expect(guestApprove(declined, "salads", NOW)).toMatchObject({ ok: false, code: "SUGGESTION_ALREADY_DECIDED" });
    expect(guestUndo(declined, "salads", new Date(NOW.getTime() + UNDO_WINDOW_MS + 1))).toMatchObject({ ok: false, code: "UNDO_UNAVAILABLE" });
    expect(guestApprove(poll("pizza-night"), "nope", NOW)).toMatchObject({ ok: false, code: "SUGGESTION_NOT_FOUND" });
    expect(guestApprove(poll("meal-out"), "thu-24-sep", NOW)).toMatchObject({ ok: false, code: "POLL_SETTLED" });
  });

  it("ends voting early, revealing backers, then reopens with a new closing time", () => {
    const ended = unwrap(guestEndVoting(poll("pizza-night"), NOW));
    const settledView = guestCreatorView(ended, at(1));
    expect(settledView).toMatchObject({ status: "settled", endedEarly: true, settledAt: NOW.toISOString() });
    expect(settledView.options[0].backers).toHaveLength(5);

    expect(guestReopenVoting(ended, at(2), at(1))).toMatchObject({ ok: false, code: "CLOSING_TIME_INVALID" });
    const reopened = unwrap(guestReopenVoting(ended, at(90), at(1)));
    expect(guestCreatorView(reopened, at(2))).toMatchObject({ status: "open", closesAt: at(90).toISOString() });
  });
});

describe("guest voting (the vote page, in the browser)", () => {
  const kiki = { name: "Kiki", avatar: { seed: "Felix", tint: "f8c9b9" as const } };
  const ballot = (overrides: Partial<Parameters<typeof guestCastBallot>[1]> = {}) => ({
    ballotId: "ballot-1",
    voterToken: "guest-token-0000000001",
    voter: kiki,
    optionIds: ["jaws"],
    ...overrides,
  });

  it("counts a vote, shows it to the organiser, and gives the voter their own ballot back", () => {
    const voted = unwrap(guestCastBallot(poll("friday-film-club"), ballot(), NOW));
    const organiser = guestCreatorView(voted, NOW);
    expect(organiser.voters[0]).toMatchObject({ name: "Kiki" });
    expect(organiser.totalVotes).toBe(guestCreatorView(poll("friday-film-club"), NOW).totalVotes + 1);

    const mine = guestPublicView(voted, NOW, "guest-token-0000000001");
    expect(mine.viewerBallot).toEqual({ optionIds: ["jaws"], castAt: NOW.toISOString() });
    expect(mine).not.toHaveProperty("pendingSuggestions");
    expect(guestPublicView(voted, NOW, "someone-else-0000001").viewerBallot).toBeNull();
    // Attribution stays hidden while voting is open.
    expect(mine.options.every((option) => option.backers === null)).toBe(true);
  });

  it("allows one ballot per browser, and a retry of the same ballot counts once", () => {
    const voted = unwrap(guestCastBallot(poll("friday-film-club"), ballot(), NOW));
    expect(unwrap(guestCastBallot(voted, ballot(), at(1))).votes).toHaveLength(voted.votes.length);
    expect(guestCastBallot(voted, ballot({ ballotId: "ballot-2", optionIds: ["heat"] }), at(1))).toMatchObject({ ok: false, code: "ALREADY_VOTED" });
  });

  it("refuses what the vote API refuses", () => {
    expect(guestCastBallot(poll("meal-out"), ballot({ optionIds: ["thu-24-sep"] }), NOW)).toMatchObject({ ok: false, code: "POLL_SETTLED" });
    expect(guestCastBallot(poll("friday-film-club"), ballot({ optionIds: ["jaws", "heat"] }), NOW)).toMatchObject({ ok: false, code: "INVALID_CHOICE" });
    expect(guestCastBallot(poll("pizza-night"), ballot({ optionIds: ["salads"] }), NOW)).toMatchObject({ ok: false, code: "INVALID_CHOICE" });
    expect(guestCastBallot(poll("friday-film-club"), ballot({ voter: { ...kiki, name: "  " } }), NOW)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    const two = unwrap(guestCastBallot(poll("birthday-brunch"), ballot({ optionIds: ["marlowe", "francas"] }), NOW));
    expect(guestCreatorView(two, NOW).totalVotes).toBe(2);
  });

  it("sends a suggestion to the organiser's queue, not onto the ballot", () => {
    const suggestion = { id: "s1", label: "  Paddington 2 ", suggestedBy: kiki, voterToken: "guest-token-0000000001" };
    const suggested = unwrap(guestSuggest(poll("friday-film-club"), suggestion, NOW));
    expect(guestCreatorView(suggested, NOW).pendingSuggestions).toEqual([
      { id: "s1", label: "Paddington 2", suggestedBy: kiki, createdAt: NOW.toISOString() },
    ]);
    expect(guestPublicView(suggested, NOW, null).options.map((option) => option.label)).not.toContain("Paddington 2");
    expect(guestSuggest(suggested, { ...suggestion, id: "s2", label: "paddington 2" }, NOW)).toMatchObject({ ok: false, code: "DUPLICATE_OPTION" });
    expect(guestSuggest(poll("meal-out"), suggestion, NOW)).toMatchObject({ ok: false, code: "POLL_SETTLED" });
  });
});

describe("parseStoredGuest", () => {
  const stored = { savedAt: NOW.getTime(), data, ended: [] };

  it("reads back what guest mode saved", () => {
    expect(parseStoredGuest(JSON.stringify(stored), NOW.getTime())).toEqual(stored);
  });

  it("ignores missing, broken and stale data", () => {
    expect(parseStoredGuest(null, NOW.getTime())).toBeNull();
    expect(parseStoredGuest("{not json", NOW.getTime())).toBeNull();
    expect(parseStoredGuest(JSON.stringify({ savedAt: NOW.getTime() }), NOW.getTime())).toBeNull();
    expect(parseStoredGuest(JSON.stringify(stored), at(13 * 60).getTime())).toBeNull();
  });
});
