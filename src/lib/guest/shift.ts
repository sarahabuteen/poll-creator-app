import type { SampleData, SamplePoll, SamplePollOption } from "@/db/sample-types";

/**
 * The sample timestamps are written as if "now" is this instant (see
 * data/README.md). Shifting by `now - SAMPLE_NOW` keeps the story true at any
 * moment: pizza night always "closes today", the brunch is always days away.
 */
export const SAMPLE_NOW = Date.parse("2026-09-17T15:00:00Z");

/** A sample option that can carry a guest's moderation decision. */
export type GuestOption = SamplePollOption & { decidedAt?: string | null };
export type GuestPoll = Omit<SamplePoll, "options"> & { options: GuestOption[] };
export type GuestData = { creator: SampleData["creator"]; polls: GuestPoll[] };

export function shiftSampleData(data: SampleData, now: number): GuestData {
  const offset = now - SAMPLE_NOW;
  const shift = (iso: string) => new Date(Date.parse(iso) + offset).toISOString();

  return {
    creator: data.creator,
    polls: data.polls.map((poll) => ({
      ...poll,
      createdAt: shift(poll.createdAt),
      closesAt: shift(poll.closesAt),
      settledAt: poll.settledAt ? shift(poll.settledAt) : null,
      options: poll.options.map((option) => ({ ...option, decidedAt: null })),
      votes: poll.votes.map((vote) => ({ ...vote, castAt: shift(vote.castAt) })),
    })),
  };
}
