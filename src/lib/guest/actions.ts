import { isPollRuleError, PollRuleError, type PollRuleCode } from "@/domain/errors";
import { parseInput, personInput, suggestOptionInput } from "@/domain/inputs";
import {
  assertCanAddOption,
  assertOpen,
  assertSuggestionQuota,
  decideSuggestion,
  endVoting as endVotingRule,
  reopenVoting as reopenVotingRule,
  undoDecision,
  validateChoices,
} from "@/domain/rules";
import type { Person } from "@/domain/views";
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

const onBallotState = (option: GuestOption) => ({
  id: option.id,
  source: option.source,
  suggestionStatus: option.suggestionStatus ?? null,
});

export type GuestBallot = { ballotId: string; voterToken: string; voter: Person; optionIds: string[] };

/** Casting a vote, by the same rules as POST /api/polls/:slug/ballots: one ballot per browser, votes final. */
export function guestCastBallot(poll: GuestPoll, ballot: GuestBallot, now: Date): GuestActionResult {
  return attempt(() => {
    const mine = poll.votes.filter((vote) => vote.voterToken === ballot.voterToken);
    // A retry of the same ballot is recognised, even after voting closed.
    if (mine.length > 0 && mine.every((vote) => vote.ballotId === ballot.ballotId)) return poll;
    if (mine.length > 0) throw new PollRuleError("ALREADY_VOTED", "This browser has already voted on this poll.");

    assertOpen(state(poll), now);
    const voter = parseInput(personInput, ballot.voter);
    const optionIds = validateChoices({ voteType: poll.type, maxChoices: poll.maxChoices }, poll.options.map(onBallotState), ballot.optionIds);
    const castAt = now.toISOString();
    return {
      ...poll,
      votes: [...poll.votes, ...optionIds.map((optionId) => ({ optionId, voter, voterToken: ballot.voterToken, castAt, ballotId: ballot.ballotId }))],
    };
  });
}

/** Suggesting an option, by the same rules as POST /api/polls/:slug/suggestions. */
export function guestSuggest(
  poll: GuestPoll,
  suggestion: { id: string; label: string; suggestedBy: Person; voterToken: string },
  now: Date,
): GuestActionResult {
  return attempt(() => {
    const input = parseInput(suggestOptionInput, suggestion);
    assertOpen(state(poll), now);
    if (!poll.suggestionsEnabled) throw new PollRuleError("SUGGESTIONS_DISABLED", "This poll isn't taking suggestions.");
    assertCanAddOption(poll.options.map((option) => ({ ...onBallotState(option), label: option.label })), input.label);
    const pending = poll.options.filter((option) => option.suggestionStatus === "pending");
    assertSuggestionQuota({
      pendingForVoter: pending.filter((option) => option.suggestedByToken === input.voterToken).length,
      pendingForPoll: pending.length,
    });
    const added: GuestOption = {
      id: suggestion.id,
      label: input.label,
      source: "suggestion",
      suggestionStatus: "pending",
      suggestedBy: input.suggestedBy,
      suggestedByToken: input.voterToken,
      createdAt: now.toISOString(),
      decidedAt: null,
    };
    return { ...poll, options: [...poll.options, added] };
  });
}

/** The ballot a browser cast, if any, as the public view reports it. */
export function guestViewerBallot(poll: GuestPoll, voterToken: string | null) {
  const mine = voterToken ? poll.votes.filter((vote) => vote.voterToken === voterToken) : [];
  return mine.length > 0 ? { optionIds: mine.map((vote) => vote.optionId), castAt: mine[0].castAt } : null;
}
