import { describe, expect, it } from "vitest";
import raw from "../../../data/sample-polls.json";
import type { SampleData } from "@/db/sample-types";
import { UNDO_WINDOW_MS } from "@/domain/rules";
import { guestApprove, guestDecline, guestEndVoting, guestReopenVoting, guestUndo } from "./actions";
import { SAMPLE_NOW, shiftSampleData, type GuestPoll } from "./shift";
import { guestCreatorView, guestSummary } from "./views";

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
