import { describe, expect, it } from "vitest";
import type { PollRuleCode } from "./errors";
import { isPollRuleError } from "./errors";
import {
  assertCanAddOption,
  assertSuggestionQuota,
  MAX_PENDING_PER_POLL,
  MAX_PENDING_PER_VOTER,
  decideSuggestion,
  effectiveState,
  endVoting,
  reopenVoting,
  undoDecision,
  UNDO_WINDOW_MS,
  validateChoices,
} from "./rules";

const now = new Date("2030-01-01T12:00:00Z");
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

function expectRule(fn: () => unknown, code: PollRuleCode) {
  try {
    fn();
  } catch (error) {
    expect(isPollRuleError(error, code), `expected ${code}, got ${String(error)}`).toBe(true);
    return;
  }
  throw new Error(`expected ${code}, but nothing was thrown`);
}

describe("effectiveState", () => {
  it("is open before the closing time", () => {
    expect(effectiveState({ status: "open", closesAt: at(1), settledAt: null }, now)).toEqual({
      status: "open",
      settledAt: null,
      endedEarly: false,
    });
  });

  it("settles at the closing time even though nothing wrote to the poll", () => {
    expect(effectiveState({ status: "open", closesAt: now, settledAt: null }, now)).toEqual({
      status: "settled",
      settledAt: now,
      endedEarly: false,
    });
  });

  it("knows when voting was ended early", () => {
    expect(effectiveState({ status: "settled", closesAt: at(60), settledAt: at(-5) }, now)).toMatchObject({
      status: "settled",
      endedEarly: true,
    });
  });
});

describe("ending and reopening", () => {
  it("ends an open poll now", () => {
    expect(endVoting({ status: "open", closesAt: at(60), settledAt: null }, now)).toEqual({
      status: "settled",
      closesAt: at(60),
      settledAt: now,
    });
  });

  it("refuses to end a poll that has already settled, including by its deadline", () => {
    expectRule(() => endVoting({ status: "settled", closesAt: at(60), settledAt: at(-1) }, now), "POLL_SETTLED");
    expectRule(() => endVoting({ status: "open", closesAt: at(-1), settledAt: null }, now), "POLL_SETTLED");
  });

  it("reopens with a fresh closing time", () => {
    expect(reopenVoting({ status: "settled", closesAt: at(-60), settledAt: at(-60) }, at(120), now)).toEqual({
      status: "open",
      closesAt: at(120),
      settledAt: null,
    });
  });

  it("refuses to reopen an open poll or with a closing time too soon", () => {
    expectRule(() => reopenVoting({ status: "open", closesAt: at(60), settledAt: null }, at(120), now), "POLL_ALREADY_OPEN");
    expectRule(() => reopenVoting({ status: "settled", closesAt: at(-1), settledAt: at(-1) }, at(2), now), "CLOSING_TIME_INVALID");
    expectRule(
      () => reopenVoting({ status: "settled", closesAt: at(-1), settledAt: at(-1) }, at(31 * 24 * 60), now),
      "CLOSING_TIME_INVALID",
    );
  });
});

describe("validateChoices", () => {
  const ballot = [
    { id: "a", source: "creator" as const, suggestionStatus: null },
    { id: "b", source: "suggestion" as const, suggestionStatus: "approved" as const },
    { id: "c", source: "suggestion" as const, suggestionStatus: "pending" as const },
    { id: "d", source: "suggestion" as const, suggestionStatus: "declined" as const },
    { id: "e", source: "creator" as const, suggestionStatus: null },
  ];
  const single = { voteType: "single" as const, maxChoices: 1 };
  const upToTwo = { voteType: "multi" as const, maxChoices: 2 };

  it("accepts creator options and approved suggestions", () => {
    expect(validateChoices(single, ballot, ["b"])).toEqual(["b"]);
    expect(validateChoices(upToTwo, ballot, ["a", "e"])).toEqual(["a", "e"]);
  });

  it("refuses pending, declined and unknown options", () => {
    expectRule(() => validateChoices(single, ballot, ["c"]), "INVALID_CHOICE");
    expectRule(() => validateChoices(single, ballot, ["d"]), "INVALID_CHOICE");
    expectRule(() => validateChoices(single, ballot, ["zzz"]), "INVALID_CHOICE");
  });

  it("enforces the number of choices", () => {
    expectRule(() => validateChoices(single, ballot, []), "INVALID_CHOICE");
    expectRule(() => validateChoices(single, ballot, ["a", "b"]), "INVALID_CHOICE");
    expectRule(() => validateChoices(upToTwo, ballot, ["a", "b", "e"]), "INVALID_CHOICE");
    expectRule(() => validateChoices(upToTwo, ballot, ["a", "a"]), "INVALID_CHOICE");
  });
});

describe("assertCanAddOption", () => {
  const existing = [
    { id: "1", label: "Just order  Salads", source: "suggestion" as const, suggestionStatus: "pending" as const },
    { id: "2", label: "Tacos", source: "suggestion" as const, suggestionStatus: "declined" as const },
  ];

  it("refuses duplicates of live options, ignoring case and spacing", () => {
    expectRule(() => assertCanAddOption(existing, "just order salads"), "DUPLICATE_OPTION");
  });

  it("allows a declined idea to be suggested again", () => {
    expect(() => assertCanAddOption(existing, "tacos")).not.toThrow();
  });
});

describe("suggestion moderation", () => {
  const pending = { source: "suggestion" as const, suggestionStatus: "pending" as const, decidedAt: null };

  it("approves or declines a pending suggestion", () => {
    expect(decideSuggestion(pending, "approved", now)).toEqual({ ...pending, suggestionStatus: "approved", decidedAt: now });
  });

  it("refuses to rule twice, e.g. approving an already-declined suggestion", () => {
    const declined = decideSuggestion(pending, "declined", now);
    expectRule(() => decideSuggestion(declined, "approved", now), "SUGGESTION_ALREADY_DECIDED");
  });

  it("refuses to moderate a creator option", () => {
    expectRule(
      () => decideSuggestion({ source: "creator", suggestionStatus: null, decidedAt: null }, "declined", now),
      "SUGGESTION_NOT_FOUND",
    );
  });

  it("undoes a decision inside the window", () => {
    const declined = decideSuggestion(pending, "declined", now);
    expect(undoDecision(declined, 0, new Date(now.getTime() + UNDO_WINDOW_MS))).toEqual(pending);
  });

  it("refuses undo after the window, with nothing to undo, or once an approved option has votes", () => {
    const declined = decideSuggestion(pending, "declined", now);
    const approved = decideSuggestion(pending, "approved", now);
    expectRule(() => undoDecision(declined, 0, new Date(now.getTime() + UNDO_WINDOW_MS + 1)), "UNDO_UNAVAILABLE");
    expectRule(() => undoDecision(pending, 0, now), "UNDO_UNAVAILABLE");
    expectRule(() => undoDecision(approved, 1, now), "UNDO_UNAVAILABLE");
  });
});

describe("assertSuggestionQuota", () => {
  it("allows suggestions under both caps", () => {
    expect(() => assertSuggestionQuota({ pendingForVoter: MAX_PENDING_PER_VOTER - 1, pendingForPoll: MAX_PENDING_PER_POLL - 1 })).not.toThrow();
  });

  it("refuses once a voter or the poll has a full queue", () => {
    expectRule(() => assertSuggestionQuota({ pendingForVoter: MAX_PENDING_PER_VOTER, pendingForPoll: 0 }), "TOO_MANY_SUGGESTIONS");
    expectRule(() => assertSuggestionQuota({ pendingForVoter: 0, pendingForPoll: MAX_PENDING_PER_POLL }), "TOO_MANY_SUGGESTIONS");
  });
});
