import type { PollView } from "@/domain/views";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function listNames(labels: string[]): string {
  if (labels.length <= 2) return labels.join(" and ");
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

/**
 * The meta description for a vote link: what a chat preview or search result
 * says under the title. It follows the attribution rule of the page itself:
 * no counts while voting is open, the result once it has settled.
 */
export function pollDescription(poll: Pick<PollView, "title" | "status" | "options" | "totalVotes">): string {
  if (poll.status === "open") {
    return `Vote on “${poll.title}”: ${plural(poll.options.length, "option")} to choose from. Just a name and a face, no account needed.`;
  }
  if (poll.totalVotes === 0) return `Voting on “${poll.title}” has closed with no votes cast.`;

  const top = Math.max(...poll.options.map((option) => option.votes));
  const leaders = poll.options.filter((option) => option.votes === top);
  if (leaders.length > 1) {
    return `It’s a tie on “${poll.title}”: ${listNames(leaders.map((option) => option.label))}, with ${plural(top, "vote")} each.`;
  }
  return `The crew picked ${leaders[0].label} for “${poll.title}”, with ${top} of ${plural(poll.totalVotes, "vote")}.`;
}
