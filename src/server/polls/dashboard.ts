import { and, count, countDistinct, desc, eq, inArray, or } from "drizzle-orm";
import type { Db } from "@/db/connect";
import { ballots, options, polls, votes } from "@/db/schema";
import { effectiveState } from "@/domain/rules";
import type { CreatorPollSummary } from "@/domain/views";

/**
 * Every poll a creator owns, summarised for the dashboard. A fixed four
 * queries however many polls there are (no per-poll round trips), so the
 * dashboard stays fast as the list grows.
 */
export async function listCreatorPolls(db: Db, creatorId: string, now = new Date()): Promise<CreatorPollSummary[]> {
  const pollRows = await db.select().from(polls).where(eq(polls.creatorId, creatorId)).orderBy(desc(polls.createdAt));
  if (pollRows.length === 0) return [];
  const pollIds = pollRows.map((poll) => poll.id);

  const [optionVotes, voterCounts, pendingCounts] = await Promise.all([
    // Votes per ballot option: creator options and approved suggestions only.
    db
      .select({ pollId: options.pollId, label: options.label, position: options.position, votes: count(votes.ballotId) })
      .from(options)
      .leftJoin(votes, eq(votes.optionId, options.id))
      .where(
        and(
          inArray(options.pollId, pollIds),
          or(eq(options.source, "creator"), eq(options.suggestionStatus, "approved")),
        ),
      )
      .groupBy(options.id),
    // People, not votes: a pick-up-to-N ballot is one voter with several votes.
    db
      .select({ pollId: ballots.pollId, voters: countDistinct(ballots.id) })
      .from(ballots)
      .where(inArray(ballots.pollId, pollIds))
      .groupBy(ballots.pollId),
    db
      .select({ pollId: options.pollId, pending: count() })
      .from(options)
      .where(and(inArray(options.pollId, pollIds), eq(options.suggestionStatus, "pending")))
      .groupBy(options.pollId),
  ]);

  const optionsByPoll = new Map<string, typeof optionVotes>();
  for (const row of optionVotes) {
    const list = optionsByPoll.get(row.pollId) ?? [];
    list.push(row);
    optionsByPoll.set(row.pollId, list);
  }
  const voters = new Map(voterCounts.map((row) => [row.pollId, row.voters]));
  const pending = new Map(pendingCounts.map((row) => [row.pollId, row.pending]));

  return pollRows.map((poll) => {
    const state = effectiveState(poll, now);
    const ballot = (optionsByPoll.get(poll.id) ?? []).sort((a, b) => a.position - b.position);
    const top = Math.max(0, ...ballot.map((option) => option.votes));

    return {
      slug: poll.slug,
      title: poll.title,
      status: state.status,
      closesAt: poll.closesAt.toISOString(),
      settledAt: state.settledAt?.toISOString() ?? null,
      endedEarly: state.endedEarly,
      createdAt: poll.createdAt.toISOString(),
      totalVotes: ballot.reduce((sum, option) => sum + option.votes, 0),
      voterCount: voters.get(poll.id) ?? 0,
      // Moderation ends with voting, so a settled poll has nothing waiting on the creator.
      pendingSuggestions: state.status === "open" ? (pending.get(poll.id) ?? 0) : 0,
      leaders: top === 0 ? [] : ballot.filter((option) => option.votes === top).map(({ label, votes }) => ({ label, votes })),
    };
  });
}
