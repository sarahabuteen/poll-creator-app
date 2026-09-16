import type { CreatorPollSummary } from "@/domain/views";
import { pluralVotes } from "@/lib/results";
import { listNames } from "@/lib/vote/copy";

/** Open polls closing soonest first (the first one is featured); settled polls newest first. */
export function groupPolls(polls: readonly CreatorPollSummary[]) {
  const open = polls.filter((poll) => poll.status === "open").sort((a, b) => a.closesAt.localeCompare(b.closesAt));
  const settled = polls
    .filter((poll) => poll.status === "settled")
    .sort((a, b) => (b.settledAt ?? b.closesAt).localeCompare(a.settledAt ?? a.closesAt));
  return { open, settled };
}

/** The state of a poll's race in a few words. */
export function standingLine({ status, leaders, totalVotes }: CreatorPollSummary): string {
  if (totalVotes === 0 || leaders.length === 0) return status === "open" ? "No votes yet" : "Closed with no votes";
  if (leaders.length > 1) {
    return `${status === "open" ? "Tied" : "Ended in a tie"}: ${listNames(leaders.map((leader) => leader.label))}, ${leaders[0].votes} each`;
  }
  const [leader] = leaders;
  return `${leader.label} ${status === "open" ? "leads" : "won"} with ${pluralVotes(leader.votes)}`;
}

export function suggestionsWaiting(count: number): string | null {
  if (count === 0) return null;
  return `${count} ${count === 1 ? "suggestion" : "suggestions"} waiting`;
}
