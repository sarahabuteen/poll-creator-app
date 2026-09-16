import { and, asc, count, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/connect";
import { ballots, options, polls, votes } from "@/db/schema";
import { effectiveState, isOnBallot, UNDO_WINDOW_MS } from "@/domain/rules";
import type {
  AvatarTint,
  BallotOptionView,
  CreatorPollView,
  Person,
  PollView,
  PublicPollView,
  SuggestionView,
} from "@/domain/views";

type OptionRow = typeof options.$inferSelect;

const person = (name: string, seed: string, tint: string): Person => ({
  name,
  avatar: { seed, tint: tint as AvatarTint },
});

const suggester = (row: OptionRow): Person | null =>
  row.suggestedByName ? person(row.suggestedByName, row.suggestedByAvatarSeed!, row.suggestedByAvatarTint!) : null;

async function loadPoll(db: Db, slug: string, now: Date) {
  const [poll] = await db.select().from(polls).where(eq(polls.slug, slug)).limit(1);
  if (!poll) return null;

  const state = effectiveState(poll, now);
  const [optionRows, countRows, voterRows] = await Promise.all([
    db.select().from(options).where(eq(options.pollId, poll.id)).orderBy(asc(options.position)),
    db
      .select({ optionId: votes.optionId, votes: count() })
      .from(votes)
      .innerJoin(ballots, eq(votes.ballotId, ballots.id))
      .where(eq(ballots.pollId, poll.id))
      .groupBy(votes.optionId),
    // Who voted, never what: this query doesn't touch the votes table.
    db
      .select({
        name: ballots.voterName,
        seed: ballots.avatarSeed,
        tint: ballots.avatarTint,
        castAt: ballots.castAt,
      })
      .from(ballots)
      .where(eq(ballots.pollId, poll.id))
      .orderBy(desc(ballots.castAt)),
  ]);

  // Attribution is revealed at close: the voter-to-option join only runs for settled polls.
  const backers = new Map<string, Person[]>();
  if (state.status === "settled") {
    const rows = await db
      .select({ optionId: votes.optionId, name: ballots.voterName, seed: ballots.avatarSeed, tint: ballots.avatarTint })
      .from(votes)
      .innerJoin(ballots, eq(votes.ballotId, ballots.id))
      .where(eq(ballots.pollId, poll.id))
      .orderBy(asc(ballots.castAt));
    for (const row of rows) {
      const list = backers.get(row.optionId) ?? [];
      list.push(person(row.name, row.seed, row.tint));
      backers.set(row.optionId, list);
    }
  }

  const counts = new Map(countRows.map((row) => [row.optionId, row.votes]));
  const ballotOptions = optionRows.filter(isOnBallot).map(
    (row): BallotOptionView => ({
      id: row.id,
      label: row.label,
      source: row.source,
      suggestedBy: suggester(row),
      votes: counts.get(row.id) ?? 0,
      backers: state.status === "settled" ? (backers.get(row.id) ?? []) : null,
    }),
  );

  const view: PollView = {
    slug: poll.slug,
    title: poll.title,
    voteType: poll.voteType,
    maxChoices: poll.maxChoices,
    suggestionsEnabled: poll.suggestionsEnabled,
    status: state.status,
    closesAt: poll.closesAt.toISOString(),
    settledAt: state.settledAt?.toISOString() ?? null,
    endedEarly: state.endedEarly,
    createdAt: poll.createdAt.toISOString(),
    options: ballotOptions,
    totalVotes: ballotOptions.reduce((sum, option) => sum + option.votes, 0),
    voters: voterRows.map((row) => ({ ...person(row.name, row.seed, row.tint), castAt: row.castAt.toISOString() })),
  };

  return { poll, view, optionRows };
}

/** The vote page and anyone holding the link. */
export async function getPublicPollView(
  db: Db,
  slug: string,
  { voterToken, now = new Date() }: { voterToken?: string; now?: Date } = {},
): Promise<PublicPollView | null> {
  const loaded = await loadPoll(db, slug, now);
  if (!loaded) return null;

  let viewerBallot: PublicPollView["viewerBallot"] = null;
  if (voterToken) {
    // A voter may always see their own choice ("You backed Veggie supreme").
    const rows = await db
      .select({ optionId: votes.optionId, castAt: ballots.castAt })
      .from(ballots)
      .leftJoin(votes, eq(votes.ballotId, ballots.id))
      .where(and(eq(ballots.pollId, loaded.poll.id), eq(ballots.voterToken, voterToken)));
    if (rows.length > 0) {
      viewerBallot = {
        optionIds: rows.flatMap((row) => (row.optionId ? [row.optionId] : [])),
        castAt: rows[0].castAt.toISOString(),
      };
    }
  }

  return { ...loaded.view, audience: "public", viewerBallot };
}

/** The creator's management view. Returns null for polls the creator doesn't own. */
export async function getCreatorPollView(
  db: Db,
  slug: string,
  { creatorId, now = new Date() }: { creatorId: string; now?: Date },
): Promise<CreatorPollView | null> {
  const loaded = await loadPoll(db, slug, now);
  if (!loaded || loaded.poll.creatorId !== creatorId) return null;

  const suggestionView = (row: OptionRow): SuggestionView => ({
    id: row.id,
    label: row.label,
    suggestedBy: suggester(row)!,
    createdAt: row.createdAt.toISOString(),
  });

  const undoCutoff = now.getTime() - UNDO_WINDOW_MS;
  return {
    ...loaded.view,
    audience: "creator",
    pendingSuggestions: loaded.optionRows.filter((row) => row.suggestionStatus === "pending").map(suggestionView),
    undoableDecisions: loaded.optionRows
      .filter(
        (row): row is OptionRow & { suggestionStatus: "approved" | "declined"; decidedAt: Date } =>
          row.decidedAt !== null && row.decidedAt.getTime() >= undoCutoff && row.suggestionStatus !== "pending",
      )
      .map((row) => ({
        ...suggestionView(row),
        decision: row.suggestionStatus,
        decidedAt: row.decidedAt.toISOString(),
        undoUntil: new Date(row.decidedAt.getTime() + UNDO_WINDOW_MS).toISOString(),
      })),
  };
}
