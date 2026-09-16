import type { Poll, PollOption } from "./types";

/** Past this many votes, one tick per voter stops reading as a scoreboard. */
export const TALLY_MAX_VOTES = 20;

export type OptionResult = {
  option: PollOption;
  votes: number;
  /** Share of all votes, rounded to a whole number: no false precision at small n. */
  percent: number;
  /** Bar width relative to the leader (0–100), so bars answer "how far behind?". */
  relativeWidth: number;
  /** True when another option in the same group has exactly this many votes. */
  tied: boolean;
};

export type PollResults = {
  totalVotes: number;
  /** Everyone at the top. More than one entry means the lead is tied. */
  leaders: OptionResult[];
  /** Everyone else, most votes first. */
  pack: OptionResult[];
  /** Votes between the leader and the runner-up (0 when tied). */
  margin: number;
};

export function isOnBallot(option: PollOption): boolean {
  return option.source === "creator" || option.suggestionStatus === "approved";
}

export function pendingSuggestions(poll: Poll): PollOption[] {
  return poll.options.filter(
    (option) => option.source === "suggestion" && option.suggestionStatus === "pending",
  );
}

/** Counts are always derived from the vote rows, never stored. */
export function deriveResults(poll: Poll): PollResults {
  const counts = new Map<string, number>();
  for (const vote of poll.votes) {
    counts.set(vote.optionId, (counts.get(vote.optionId) ?? 0) + 1);
  }

  const totalVotes = poll.votes.length;
  // Array.prototype.sort is stable, so equal counts keep ballot order.
  const ranked = poll.options
    .filter(isOnBallot)
    .map((option) => ({ option, votes: counts.get(option.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes);

  const topVotes = ranked[0]?.votes ?? 0;
  const toResult = (entry: { option: PollOption; votes: number }): OptionResult => ({
    ...entry,
    percent: totalVotes === 0 ? 0 : Math.round((entry.votes / totalVotes) * 100),
    relativeWidth: topVotes === 0 ? 0 : (entry.votes / topVotes) * 100,
    tied: entry.votes > 0 && ranked.filter((other) => other.votes === entry.votes).length > 1,
  });

  // With no votes there's no leader: "leading" would be a claim, not a fact.
  const leaders = topVotes === 0 ? [] : ranked.filter((entry) => entry.votes === topVotes).map(toResult);
  const pack = ranked.slice(leaders.length).map(toResult);
  const margin = leaders.length === 1 ? topVotes - (pack[0]?.votes ?? 0) : 0;

  return { totalVotes, leaders, pack, margin };
}

export function pluralVotes(count: number): string {
  return `${count} ${count === 1 ? "vote" : "votes"}`;
}

/** The friend keeping score: a short read on the state of the race. */
export function raceCall({ totalVotes, leaders, margin }: PollResults): string {
  if (totalVotes === 0) return "waiting on the first vote";
  if (totalVotes === 1) return "too early to call";
  if (leaders.length > 1) return `tied at ${pluralVotes(leaders[0].votes)} each`;
  if (leaders[0].votes / totalVotes > 0.5 && margin >= 3) return "pulling away";
  return "still anyone’s game";
}
