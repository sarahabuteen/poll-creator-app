import { isPollRuleError, PollRuleError, type PollRuleCode } from "@/domain/errors";
import {
  assertOpen,
  decideSuggestion,
  endVoting as endVotingRule,
  reopenVoting as reopenVotingRule,
  undoDecision,
} from "@/domain/rules";
import type { GuestOption, GuestPoll } from "./shift";

/**
 * Guest actions reuse the real rules engine, so guests meet exactly the
 * behaviour the product has (no approving a declined suggestion, undo windows,
 * reopening needs a new closing time). Nothing leaves the browser.
 */
export type GuestActionResult = { ok: true; poll: GuestPoll } | { ok: false; code: PollRuleCode; message: string };

function attempt(run: () => GuestPoll): GuestActionResult {
  try {
    return { ok: true, poll: run() };
  } catch (error) {
    if (isPollRuleError(error)) return { ok: false, code: error.code, message: error.message };
    throw error;
  }
}

const state = (poll: GuestPoll) => ({
  status: poll.status,
  closesAt: new Date(poll.closesAt),
  settledAt: poll.settledAt ? new Date(poll.settledAt) : null,
});

function withOption(poll: GuestPoll, optionId: string, update: (option: GuestOption) => GuestOption): GuestPoll {
  const option = poll.options.find((item) => item.id === optionId);
  if (!option) throw new PollRuleError("SUGGESTION_NOT_FOUND", "Suggestion not found.");
  return { ...poll, options: poll.options.map((item) => (item.id === optionId ? update(item) : item)) };
}

const suggestionState = (option: GuestOption) => ({
  source: option.source,
  suggestionStatus: option.suggestionStatus ?? null,
  decidedAt: option.decidedAt ? new Date(option.decidedAt) : null,
});

function moderate(poll: GuestPoll, optionId: string, decision: "approved" | "declined", now: Date): GuestActionResult {
  return attempt(() => {
    assertOpen(state(poll), now);
    return withOption(poll, optionId, (option) => {
      const next = decideSuggestion(suggestionState(option), decision, now);
      return { ...option, suggestionStatus: next.suggestionStatus ?? undefined, decidedAt: next.decidedAt?.toISOString() ?? null };
    });
  });
}

export const guestApprove = (poll: GuestPoll, optionId: string, now: Date) => moderate(poll, optionId, "approved", now);
export const guestDecline = (poll: GuestPoll, optionId: string, now: Date) => moderate(poll, optionId, "declined", now);

export function guestUndo(poll: GuestPoll, optionId: string, now: Date): GuestActionResult {
  return attempt(() => {
    assertOpen(state(poll), now);
    const votes = poll.votes.filter((vote) => vote.optionId === optionId).length;
    return withOption(poll, optionId, (option) => {
      const next = undoDecision(suggestionState(option), votes, now);
      return { ...option, suggestionStatus: next.suggestionStatus ?? undefined, decidedAt: null };
    });
  });
}

export function guestEndVoting(poll: GuestPoll, now: Date): GuestActionResult {
  return attempt(() => {
    const next = endVotingRule(state(poll), now);
    return { ...poll, status: next.status, settledAt: next.settledAt?.toISOString() ?? null };
  });
}

export function guestReopenVoting(poll: GuestPoll, closesAt: Date, now: Date): GuestActionResult {
  return attempt(() => {
    const next = reopenVotingRule(state(poll), closesAt, now);
    return { ...poll, status: next.status, closesAt: next.closesAt.toISOString(), settledAt: null };
  });
}
