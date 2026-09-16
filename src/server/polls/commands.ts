import { and, count, eq, max, or, sql } from "drizzle-orm";
import type { Db } from "@/db/connect";
import { ballots, options, polls, votes } from "@/db/schema";
import { PollRuleError } from "@/domain/errors";
import {
  castBallotInput,
  createPollInput,
  parseInput,
  suggestOptionInput,
  type CastBallotInput,
  type CreatePollInput,
  type SuggestOptionInput,
} from "@/domain/inputs";
import {
  assertCanAddOption,
  assertSuggestionQuota,
  assertOpen,
  assertValidClosingTime,
  decideSuggestion,
  endVoting as endVotingRule,
  normalizeLabel,
  reopenVoting as reopenVotingRule,
  undoDecision,
  validateChoices,
} from "@/domain/rules";

/**
 * Every write goes through here: load and lock the poll row, ask the rules in
 * `@/domain/rules`, then write. The row lock serialises writes per poll, so a
 * vote can't slip in while the creator is ending voting.
 */

type PollRow = typeof polls.$inferSelect;

async function lockPoll(tx: Db, slug: string): Promise<PollRow> {
  const [poll] = await tx.select().from(polls).where(eq(polls.slug, slug)).for("update");
  if (!poll) throw new PollRuleError("POLL_NOT_FOUND", "Poll not found.");
  return poll;
}

/** Every write that changes a poll's views calls this inside its transaction. */
async function bumpRevision(tx: Db, pollId: string) {
  await tx
    .update(polls)
    .set({ revision: sql`${polls.revision} + 1` })
    .where(eq(polls.id, pollId));
}

/** Someone else's poll looks exactly like a missing one. */
async function lockOwnPoll(tx: Db, slug: string, creatorId: string): Promise<PollRow> {
  const poll = await lockPoll(tx, slug);
  if (poll.creatorId !== creatorId) throw new PollRuleError("POLL_NOT_FOUND", "Poll not found.");
  return poll;
}

/** 80 bits of randomness, URL-safe: the link is the access control for voting. */
export function generateSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Buffer.from(bytes).toString("base64url");
}

/** True when a write failed on a specific unique constraint (Postgres code 23505). */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current: unknown = error; current; current = (current as { cause?: unknown }).cause) {
    const candidate = current as { code?: string; constraint?: string; constraint_name?: string };
    if (candidate.code === "23505" && (candidate.constraint ?? candidate.constraint_name) === constraint) return true;
  }
  return false;
}

const SLUG_ATTEMPTS = 3;

export async function createPoll(
  db: Db,
  creatorId: string,
  rawInput: CreatePollInput,
  now = new Date(),
  { makeSlug = generateSlug }: { makeSlug?: () => string } = {},
) {
  const input = parseInput(createPollInput, rawInput);
  assertValidClosingTime(input.closesAt, now);

  const labels = new Set(input.options.map(normalizeLabel));
  if (labels.size !== input.options.length) {
    throw new PollRuleError("DUPLICATE_OPTION", "Each option needs a different name.");
  }
  if (input.voteType === "multi" && (input.maxChoices < 2 || input.maxChoices > input.options.length)) {
    throw new PollRuleError("INVALID_INPUT", "Pick-up-to-N polls allow between 2 and the number of options.");
  }

  // 80 random bits make a clash vanishingly rare, but a clash must still never surface as an error.
  for (let attempt = 1; ; attempt++) {
    try {
      return await insertPoll(db, creatorId, input, now, makeSlug());
    } catch (error) {
      if (attempt >= SLUG_ATTEMPTS || !isUniqueViolation(error, "polls_slug_unique")) throw error;
    }
  }
}

async function insertPoll(
  db: Db,
  creatorId: string,
  input: ReturnType<typeof createPollInput.parse>,
  now: Date,
  slug: string,
) {
  return db.transaction(async (tx) => {
    const [poll] = await tx
      .insert(polls)
      .values({
        slug,
        creatorId,
        title: input.title,
        voteType: input.voteType,
        maxChoices: input.maxChoices,
        suggestionsEnabled: input.suggestionsEnabled,
        closesAt: input.closesAt,
        createdAt: now,
      })
      .returning({ id: polls.id, slug: polls.slug });

    await tx.insert(options).values(
      input.options.map((label, position) => ({ pollId: poll.id, label, position, source: "creator" as const, createdAt: now })),
    );
    return poll;
  });
}

export type CastBallotResult = {
  ballotId: string;
  optionIds: string[];
  castAt: Date;
  /** True when this exact ballot was already recorded, e.g. a retried or double submit. */
  replayed: boolean;
};

/**
 * Casting is idempotent per ballot id: resubmitting the same ballot returns
 * the recorded one instead of failing or counting twice. A *different* ballot
 * from a browser that has already voted is refused: votes are final.
 */
export async function castBallot(
  db: Db,
  slug: string,
  rawInput: CastBallotInput,
  now = new Date(),
): Promise<CastBallotResult> {
  const input = parseInput(castBallotInput, rawInput);

  return db.transaction(async (tx) => {
    const poll = await lockPoll(tx, slug);

    const existing = await tx
      .select()
      .from(ballots)
      .where(or(eq(ballots.id, input.ballotId), and(eq(ballots.pollId, poll.id), eq(ballots.voterToken, input.voterToken))));

    const replay = existing.find(
      (ballot) => ballot.id === input.ballotId && ballot.pollId === poll.id && ballot.voterToken === input.voterToken,
    );
    // Checked before the open/closed rule: a retry that lands after close still gets its recorded vote back.
    if (replay) {
      const chosen = await tx.select({ optionId: votes.optionId }).from(votes).where(eq(votes.ballotId, replay.id));
      return { ballotId: replay.id, optionIds: chosen.map((row) => row.optionId), castAt: replay.castAt, replayed: true };
    }
    if (existing.some((ballot) => ballot.pollId === poll.id && ballot.voterToken === input.voterToken)) {
      throw new PollRuleError("ALREADY_VOTED", "This browser has already voted on this poll.");
    }
    if (existing.length > 0) {
      throw new PollRuleError("BALLOT_ID_CONFLICT", "That ballot id belongs to a different vote.");
    }

    assertOpen(poll, now);
    const pollOptions = await tx
      .select({ id: options.id, source: options.source, suggestionStatus: options.suggestionStatus })
      .from(options)
      .where(eq(options.pollId, poll.id));
    const optionIds = validateChoices(poll, pollOptions, input.optionIds);

    await tx.insert(ballots).values({
      id: input.ballotId,
      pollId: poll.id,
      voterToken: input.voterToken,
      voterName: input.voter.name,
      avatarSeed: input.voter.avatar.seed,
      avatarTint: input.voter.avatar.tint,
      castAt: now,
    });
    await tx.insert(votes).values(optionIds.map((optionId) => ({ ballotId: input.ballotId, optionId })));
    await bumpRevision(tx, poll.id);

    return { ballotId: input.ballotId, optionIds, castAt: now, replayed: false };
  });
}

/** A voter proposes an option. It stays off the public ballot until the creator rules on it. */
export async function suggestOption(db: Db, slug: string, rawInput: SuggestOptionInput, now = new Date()) {
  const input = parseInput(suggestOptionInput, rawInput);

  return db.transaction(async (tx) => {
    const poll = await lockPoll(tx, slug);
    assertOpen(poll, now);
    if (!poll.suggestionsEnabled) {
      throw new PollRuleError("SUGGESTIONS_DISABLED", "This poll isn't taking suggestions.");
    }

    const existing = await tx
      .select({
        id: options.id,
        label: options.label,
        source: options.source,
        suggestionStatus: options.suggestionStatus,
        suggestedByToken: options.suggestedByToken,
      })
      .from(options)
      .where(eq(options.pollId, poll.id));
    assertCanAddOption(existing, input.label);
    const pending = existing.filter((option) => option.suggestionStatus === "pending");
    assertSuggestionQuota({
      pendingForVoter: pending.filter((option) => option.suggestedByToken === input.voterToken).length,
      pendingForPoll: pending.length,
    });

    const [{ lastPosition }] = await tx
      .select({ lastPosition: max(options.position) })
      .from(options)
      .where(eq(options.pollId, poll.id));

    const [suggestion] = await tx
      .insert(options)
      .values({
        pollId: poll.id,
        label: input.label,
        position: (lastPosition ?? -1) + 1,
        source: "suggestion",
        suggestionStatus: "pending",
        suggestedByName: input.suggestedBy.name,
        suggestedByAvatarSeed: input.suggestedBy.avatar.seed,
        suggestedByAvatarTint: input.suggestedBy.avatar.tint,
        suggestedByToken: input.voterToken,
        createdAt: now,
      })
      .returning({ id: options.id });
    await bumpRevision(tx, poll.id);
    return suggestion;
  });
}

type ModerationTarget = { slug: string; creatorId: string; optionId: string };

async function lockSuggestion(tx: Db, poll: PollRow, optionId: string) {
  const [option] = await tx
    .select()
    .from(options)
    .where(and(eq(options.id, optionId), eq(options.pollId, poll.id)))
    .for("update");
  if (!option) throw new PollRuleError("SUGGESTION_NOT_FOUND", "Suggestion not found.");
  return option;
}

async function moderate({ slug, creatorId, optionId }: ModerationTarget, db: Db, decision: "approved" | "declined", now: Date) {
  return db.transaction(async (tx) => {
    const poll = await lockOwnPoll(tx, slug, creatorId);
    // The ballot is fixed once voting ends.
    assertOpen(poll, now);
    const option = await lockSuggestion(tx, poll, optionId);
    const next = decideSuggestion(option, decision, now);

    await tx
      .update(options)
      .set({ suggestionStatus: next.suggestionStatus, decidedAt: next.decidedAt })
      .where(eq(options.id, option.id));
    await bumpRevision(tx, poll.id);
    return { optionId: option.id, status: next.suggestionStatus, decidedAt: next.decidedAt };
  });
}

/** "Add it": the suggestion joins the ballot with 0 votes. */
export function approveSuggestion(db: Db, target: ModerationTarget, now = new Date()) {
  return moderate(target, db, "approved", now);
}

/** "Not this time". Recoverable through `undoModeration` for a while. */
export function declineSuggestion(db: Db, target: ModerationTarget, now = new Date()) {
  return moderate(target, db, "declined", now);
}

/** The undo toast: returns an approved or declined suggestion to pending. */
export async function undoModeration(db: Db, target: ModerationTarget, now = new Date()) {
  return db.transaction(async (tx) => {
    const poll = await lockOwnPoll(tx, target.slug, target.creatorId);
    assertOpen(poll, now);
    const option = await lockSuggestion(tx, poll, target.optionId);
    const [{ value: votesForOption }] = await tx
      .select({ value: count() })
      .from(votes)
      .where(eq(votes.optionId, option.id));
    const next = undoDecision(option, votesForOption, now);

    await tx
      .update(options)
      .set({ suggestionStatus: next.suggestionStatus, decidedAt: next.decidedAt })
      .where(eq(options.id, option.id));
    await bumpRevision(tx, poll.id);
    return { optionId: option.id, status: next.suggestionStatus };
  });
}

/** "End voting" before the closing time. */
export async function endVoting(db: Db, target: { slug: string; creatorId: string }, now = new Date()) {
  return db.transaction(async (tx) => {
    const poll = await lockOwnPoll(tx, target.slug, target.creatorId);
    const next = endVotingRule(poll, now);
    await tx
      .update(polls)
      .set({ status: next.status, settledAt: next.settledAt, revision: sql`${polls.revision} + 1` })
      .where(eq(polls.id, poll.id));
    return next;
  });
}

/** "Reopen voting", always with a new closing time. */
export async function reopenVoting(
  db: Db,
  target: { slug: string; creatorId: string; closesAt: Date },
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    const poll = await lockOwnPoll(tx, target.slug, target.creatorId);
    const next = reopenVotingRule(poll, target.closesAt, now);
    await tx
      .update(polls)
      .set({ status: next.status, closesAt: next.closesAt, settledAt: next.settledAt, revision: sql`${polls.revision} + 1` })
      .where(eq(polls.id, poll.id));
    return next;
  });
}
