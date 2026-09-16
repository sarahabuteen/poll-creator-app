import { describe, expect, it } from "vitest";
import type { CreatorPollSummary } from "@/domain/views";
import { groupPolls, standingLine, suggestionsWaiting } from "./dashboard";

const poll = (overrides: Partial<CreatorPollSummary>): CreatorPollSummary => ({
  slug: "p",
  title: "Poll",
  status: "open",
  closesAt: "2026-09-17T18:00:00Z",
  settledAt: null,
  endedEarly: false,
  createdAt: "2026-09-17T08:00:00Z",
  totalVotes: 0,
  voterCount: 0,
  pendingSuggestions: 0,
  leaders: [],
  ...overrides,
});

describe("groupPolls", () => {
  it("puts the poll closing soonest first, and the newest result first", () => {
    const { open, settled } = groupPolls([
      poll({ slug: "later", closesAt: "2026-09-19T10:00:00Z" }),
      poll({ slug: "old", status: "settled", settledAt: "2026-09-08T20:00:00Z" }),
      poll({ slug: "soon", closesAt: "2026-09-17T18:00:00Z" }),
      poll({ slug: "recent", status: "settled", settledAt: "2026-09-12T17:30:00Z" }),
    ]);
    expect(open.map((p) => p.slug)).toEqual(["soon", "later"]);
    expect(settled.map((p) => p.slug)).toEqual(["recent", "old"]);
  });
});

describe("standingLine", () => {
  it("says it plainly for no votes, a lead, a win and a tie", () => {
    expect(standingLine(poll({}))).toBe("No votes yet");
    expect(standingLine(poll({ totalVotes: 11, leaders: [{ label: "Detroit-style", votes: 5 }] }))).toBe("Detroit-style leads with 5 votes");
    expect(standingLine(poll({ status: "settled", totalVotes: 5, leaders: [{ label: "The A-frame cabin", votes: 3 }] }))).toBe(
      "The A-frame cabin won with 3 votes",
    );
    expect(standingLine(poll({ totalVotes: 4, leaders: [{ label: "Heat", votes: 2 }, { label: "Jaws", votes: 2 }] }))).toBe("Tied: Heat and Jaws, 2 each");
  });

  it("counts waiting suggestions, or says nothing", () => {
    expect([suggestionsWaiting(0), suggestionsWaiting(1), suggestionsWaiting(3)]).toEqual([null, "1 suggestion waiting", "3 suggestions waiting"]);
  });
});
