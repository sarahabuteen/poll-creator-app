import { PollRuleError } from "./errors";
import { LIMITS } from "./inputs";

/**
 * The poll state machine, as pure functions over plain data. The database
 * layer loads rows, asks these functions, then writes: so every rule is
 * enforced server-side and testable without a database.
 *
 *   Poll:        open ──(closing time passes | End voting)──▶ settled
 *                settled ──(Reopen voting, with a new closing time)──▶ open
 *   Suggestion:  pending ──▶ approved | declined, undoable for UNDO_WINDOW_MS
 *   Ballot:      final. There is no change-vote or un-vote.
 */

/** Closing times must leave the crew a real chance to vote. */
export const MIN_VOTING_WINDOW_MS = 5 * 60_000;
/** Polls are short-lived group decisions, and settled polls retire after 30 days. */
export const MAX_VOTING_WINDOW_MS = 30 * 24 * 60 * 60_000;
/** Pending suggestions one browser can have waiting on a poll at once. */
export const MAX_PENDING_PER_VOTER = 3;
/** Pending suggestions a poll can hold, so the organiser's queue can't be buried. */
export const MAX_PENDING_PER_POLL = 10;
/** How long a moderation decision can be taken back from the undo toast. */
export const UNDO_WINDOW_MS = 10 * 60_000;

export type PollState = {
  status: "open" | "settled";
  closesAt: Date;
  settledAt: Date | null;
};

export type EffectiveState = {
  status: "open" | "settled";
  /** When voting actually ended; null while open. */
  settledAt: Date | null;
  /** True when the creator ended voting before the closing time. */
  endedEarly: boolean;
};

/**
 * Polls settle at their deadline even if nobody has the page open: rather than
 * a scheduled job, the stored state is interpreted against the clock on read.
 */
export function effectiveState(poll: PollState, now: Date): EffectiveState {
  if (poll.status === "settled") {
    const settledAt = poll.settledAt ?? poll.closesAt;
    return { status: "settled", settledAt, endedEarly: settledAt < poll.closesAt };
  }
  if (poll.closesAt <= now) {
    return { status: "settled", settledAt: poll.closesAt, endedEarly: false };
  }
  return { status: "open", settledAt: null, endedEarly: false };
}

export function assertOpen(poll: PollState, now: Date): void {
  if (effectiveState(poll, now).status !== "open") {
    throw new PollRuleError("POLL_SETTLED", "Voting on this poll has ended.");
  }
}

export function assertValidClosingTime(closesAt: Date, now: Date): void {
  const window = closesAt.getTime() - now.getTime();
  if (Number.isNaN(window) || window < MIN_VOTING_WINDOW_MS || window > MAX_VOTING_WINDOW_MS) {
    throw new PollRuleError(
      "CLOSING_TIME_INVALID",
      "Closing time must be between 5 minutes and 30 days from now.",
    );
  }
}

/** End voting early. Only an open poll can be ended. */
export function endVoting(poll: PollState, now: Date): PollState {
  assertOpen(poll, now);
  return { status: "settled", closesAt: poll.closesAt, settledAt: now };
}

/**
 * Reopen a settled poll. It undoes the group's decision, so it is always an
 * explicit act with a fresh closing time: the old deadline has usually passed,
 * and a poll left open "until ended" would never settle on its own.
 */
export function reopenVoting(poll: PollState, newClosesAt: Date, now: Date): PollState {
  if (effectiveState(poll, now).status === "open") {
    throw new PollRuleError("POLL_ALREADY_OPEN", "This poll is already open.");
  }
  assertValidClosingTime(newClosesAt, now);
  return { status: "open", closesAt: newClosesAt, settledAt: null };
}

export type BallotOption = {
  id: string;
  source: "creator" | "suggestion";
  suggestionStatus: "pending" | "approved" | "declined" | null;
};

export function isOnBallot(option: BallotOption): boolean {
  return option.source === "creator" || option.suggestionStatus === "approved";
}

/** Checks a voter's choices against the poll's rules. Returns the de-duplicated option ids. */
export function validateChoices(
  poll: { voteType: "single" | "multi"; maxChoices: number },
  pollOptions: BallotOption[],
  optionIds: string[],
): string[] {
  const chosen = [...new Set(optionIds)];
  if (chosen.length !== optionIds.length) {
    throw new PollRuleError("INVALID_CHOICE", "The same option was chosen twice.");
  }
  if (chosen.length === 0) {
    throw new PollRuleError("INVALID_CHOICE", "Pick an option to vote for.");
  }
  const limit = poll.voteType === "single" ? 1 : poll.maxChoices;
  if (chosen.length > limit) {
    throw new PollRuleError("INVALID_CHOICE", `This poll allows up to ${limit} ${limit === 1 ? "choice" : "choices"}.`);
  }
  const ballot = new Map(pollOptions.filter(isOnBallot).map((option) => [option.id, option]));
  if (chosen.some((id) => !ballot.has(id))) {
    throw new PollRuleError("INVALID_CHOICE", "That option isn't on this poll's ballot.");
  }
  return chosen;
}

export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/**
 * A new option (from the creator or a voter) can't duplicate one that's
 * already on the ballot or waiting for a decision. Declined labels may be
 * suggested again: that's a new conversation, not a duplicate.
 */
export function assertCanAddOption(
  existing: Array<BallotOption & { label: string }>,
  label: string,
): void {
  const live = existing.filter((option) => option.suggestionStatus !== "declined");
  if (live.length >= LIMITS.maxBallotOptions) {
    throw new PollRuleError("TOO_MANY_OPTIONS", "This poll has as many options as it can take.");
  }
  const wanted = normalizeLabel(label);
  if (live.some((option) => normalizeLabel(option.label) === wanted)) {
    throw new PollRuleError("DUPLICATE_OPTION", "That option is already on this poll.");
  }
}

/**
 * Suggestions wait on the organiser, so cap how many can pile up: a few per
 * voter, and a queue the organiser can realistically get through. Decided
 * suggestions don't count, so an active poll never locks anyone out for good.
 */
export function assertSuggestionQuota({ pendingForVoter, pendingForPoll }: { pendingForVoter: number; pendingForPoll: number }): void {
  if (pendingForVoter >= MAX_PENDING_PER_VOTER) {
    throw new PollRuleError(
      "TOO_MANY_SUGGESTIONS",
      `You have ${MAX_PENDING_PER_VOTER} suggestions waiting already. Give the organiser a chance to decide.`,
    );
  }
  if (pendingForPoll >= MAX_PENDING_PER_POLL) {
    throw new PollRuleError("TOO_MANY_SUGGESTIONS", "The organiser has a full queue of suggestions to get through first.");
  }
}

export type SuggestionState = {
  source: "creator" | "suggestion";
  suggestionStatus: "pending" | "approved" | "declined" | null;
  decidedAt: Date | null;
};

/** Approve or decline: only a pending suggestion can be ruled on. */
export function decideSuggestion(
  suggestion: SuggestionState,
  decision: "approved" | "declined",
  now: Date,
): SuggestionState {
  if (suggestion.source !== "suggestion") {
    throw new PollRuleError("SUGGESTION_NOT_FOUND", "Only voter suggestions can be moderated.");
  }
  if (suggestion.suggestionStatus !== "pending") {
    throw new PollRuleError("SUGGESTION_ALREADY_DECIDED", "That suggestion has already been decided.");
  }
  return { ...suggestion, suggestionStatus: decision, decidedAt: now };
}

/**
 * Take back a moderation decision from the undo toast. An approved option can
 * only be withdrawn while nobody has voted for it: votes are final.
 */
export function undoDecision(suggestion: SuggestionState, votesForOption: number, now: Date): SuggestionState {
  if (suggestion.source !== "suggestion" || suggestion.suggestionStatus === null) {
    throw new PollRuleError("SUGGESTION_NOT_FOUND", "Only voter suggestions can be moderated.");
  }
  if (suggestion.suggestionStatus === "pending" || !suggestion.decidedAt) {
    throw new PollRuleError("UNDO_UNAVAILABLE", "There's no decision to undo.");
  }
  if (now.getTime() - suggestion.decidedAt.getTime() > UNDO_WINDOW_MS) {
    throw new PollRuleError("UNDO_UNAVAILABLE", "It's too late to undo that decision.");
  }
  if (suggestion.suggestionStatus === "approved" && votesForOption > 0) {
    throw new PollRuleError("UNDO_UNAVAILABLE", "Someone has already voted for it, so it stays on the ballot.");
  }
  return { ...suggestion, suggestionStatus: "pending", decidedAt: null };
}
