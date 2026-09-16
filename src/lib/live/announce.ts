import { pluralVotes, type PollResults } from "@/lib/results";

/**
 * What the live region says about the race. One short summary, never a
 * per-vote firehose: "11 votes in. Detroit-style from Emmy's leads with 5."
 */
export function raceSummary({ totalVotes, leaders, margin }: PollResults): string {
  if (totalVotes === 0) return "No votes yet.";
  const count = `${pluralVotes(totalVotes)} in.`;
  if (leaders.length > 1) {
    return `${count} Tied at ${pluralVotes(leaders[0].votes)} each: ${leaders.map((leader) => leader.option.label).join(" and ")}.`;
  }
  const lead = leaders[0];
  const ahead = margin > 0 ? `, ahead by ${margin}` : "";
  return `${count} ${lead.option.label} leads with ${lead.votes}${ahead}.`;
}

/** A change worth announcing: new votes, or a different story at the top. */
export function isMeaningfulChange(previous: PollResults, next: PollResults): boolean {
  const topIds = (results: PollResults) => results.leaders.map((leader) => leader.option.id).join("|");
  return previous.totalVotes !== next.totalVotes || topIds(previous) !== topIds(next);
}
