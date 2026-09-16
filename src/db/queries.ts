import { asc, eq } from "drizzle-orm";
import type { AvatarTint, Poll, PollOption, Vote } from "@/lib/types";
import type { Db } from "./connect";
import { ballots, options, polls, votes } from "./schema";

/**
 * Loads a poll by its link slug in the shape the UI already renders.
 *
 * TODO(scope 3): while a poll is open this must return counts only; it still
 * returns per-voter choices, which the reveal is supposed to hold back.
 */
export async function getPollBySlug(db: Db, slug: string): Promise<Poll | null> {
  const [poll] = await db.select().from(polls).where(eq(polls.slug, slug)).limit(1);
  if (!poll) return null;

  const [optionRows, voteRows] = await Promise.all([
    db.select().from(options).where(eq(options.pollId, poll.id)).orderBy(asc(options.position)),
    db
      .select({
        optionId: votes.optionId,
        voterToken: ballots.voterToken,
        voterName: ballots.voterName,
        avatarSeed: ballots.avatarSeed,
        avatarTint: ballots.avatarTint,
        castAt: ballots.castAt,
      })
      .from(votes)
      .innerJoin(ballots, eq(votes.ballotId, ballots.id))
      .where(eq(ballots.pollId, poll.id))
      .orderBy(asc(ballots.castAt)),
  ]);

  return {
    id: poll.slug,
    title: poll.title,
    type: poll.voteType,
    maxChoices: poll.maxChoices,
    suggestionsEnabled: poll.suggestionsEnabled,
    status: poll.status,
    createdAt: poll.createdAt.toISOString(),
    closesAt: poll.closesAt.toISOString(),
    settledAt: poll.settledAt?.toISOString() ?? null,
    options: optionRows.map(
      (row): PollOption => ({
        id: row.id,
        label: row.label,
        source: row.source,
        suggestionStatus: row.suggestionStatus ?? undefined,
        suggestedBy: row.suggestedByName
          ? {
              name: row.suggestedByName,
              avatar: { seed: row.suggestedByAvatarSeed!, tint: row.suggestedByAvatarTint as AvatarTint },
            }
          : undefined,
      }),
    ),
    votes: voteRows.map(
      (row): Vote => ({
        optionId: row.optionId,
        voterToken: row.voterToken,
        voter: { name: row.voterName, avatar: { seed: row.avatarSeed, tint: row.avatarTint as AvatarTint } },
        castAt: row.castAt.toISOString(),
      }),
    ),
  };
}
