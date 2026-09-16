import { inArray } from "drizzle-orm";
import raw from "../../data/sample-polls.json";
import type { SampleData } from "@/lib/types";
import type { Db } from "./connect";
import { ballots, options, polls, votes } from "./schema";

const sample = raw as SampleData;

/**
 * The sample timestamps are written as if "now" is this instant (see
 * data/README.md). Seeding shifts every timestamp by `now - SAMPLE_NOW`, so
 * open polls are genuinely open and "closes today" stays true.
 */
export const SAMPLE_NOW = Date.parse("2026-09-17T15:00:00Z");

/** The sample creator, until creator accounts exist (scope 2). */
export const SAMPLE_CREATOR_ID = "sample-morgan";

/** Replaces the sample polls (matched by slug) with a fresh, time-shifted copy. */
export async function seedSampleData(db: Db, now = Date.now()) {
  const shift = (iso: string) => new Date(Date.parse(iso) + (now - SAMPLE_NOW));

  await db.transaction(async (tx) => {
    // Cascades to options, ballots and votes.
    await tx.delete(polls).where(
      inArray(
        polls.slug,
        sample.polls.map((poll) => poll.id),
      ),
    );

    for (const poll of sample.polls) {
      const [{ id: pollId }] = await tx
        .insert(polls)
        .values({
          slug: poll.id,
          creatorId: SAMPLE_CREATOR_ID,
          title: poll.title,
          voteType: poll.type,
          maxChoices: poll.maxChoices,
          suggestionsEnabled: poll.suggestionsEnabled,
          status: poll.status,
          closesAt: shift(poll.closesAt),
          settledAt: poll.settledAt ? shift(poll.settledAt) : null,
          createdAt: shift(poll.createdAt),
        })
        .returning({ id: polls.id });

      const optionIds = new Map<string, string>();
      for (const [position, option] of poll.options.entries()) {
        const [{ id }] = await tx
          .insert(options)
          .values({
            pollId,
            label: option.label,
            position,
            source: option.source,
            suggestionStatus: option.suggestionStatus ?? null,
            suggestedByName: option.suggestedBy?.name ?? null,
            suggestedByAvatarSeed: option.suggestedBy?.avatar.seed ?? null,
            suggestedByAvatarTint: option.suggestedBy?.avatar.tint ?? null,
            createdAt: shift(poll.createdAt),
          })
          .returning({ id: options.id });
        optionIds.set(option.id, id);
      }

      // Sample votes are one row per voter choice; group them into ballots by token.
      const ballotIds = new Map<string, string>();
      for (const vote of poll.votes) {
        let ballotId = ballotIds.get(vote.voterToken);
        if (!ballotId) {
          ballotId = crypto.randomUUID();
          ballotIds.set(vote.voterToken, ballotId);
          await tx.insert(ballots).values({
            id: ballotId,
            pollId,
            voterToken: vote.voterToken,
            voterName: vote.voter.name,
            avatarSeed: vote.voter.avatar.seed,
            avatarTint: vote.voter.avatar.tint,
            castAt: shift(vote.castAt),
          });
        }
        await tx.insert(votes).values({ ballotId, optionId: optionIds.get(vote.optionId)! });
      }
    }
  });
}
