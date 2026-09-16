import type { BallotOptionView, Person } from "@/domain/views";
import { deriveResults, pluralVotes } from "@/lib/results";
import { describeOutcome, peopleList } from "@/lib/vote/copy";

type ResultTextInput = {
  title: string;
  options: Array<Pick<BallotOptionView, "id" | "label" | "suggestedBy" | "votes"> & { backers: Person[] | null }>;
  shareUrl: string;
};

const standing = (votes: number, percent: number) => `${pluralVotes(votes)} (${percent}%)`;

/**
 * The "Copy result" payload: plain text that reads well pasted into any group
 * chat, with a count beside every percentage and a link back for the details.
 * Distinct from "Copy link", which copies only the URL.
 */
export function buildResultText({ title, options, shareUrl }: ResultTextInput): string {
  const results = deriveResults(options);
  const outcome = describeOutcome(results);
  const backersOf = (id: string) => options.find((option) => option.id === id)?.backers ?? [];
  const lines = [title, outcome.headline];

  if (outcome.kind === "winner") {
    const [winner] = results.leaders;
    lines.push(`${winner.votes} of ${pluralVotes(results.totalVotes)} (${winner.percent}%)${results.margin > 0 ? `, ahead by ${results.margin}` : ""}`);
  } else if (outcome.kind === "tie") {
    lines.push(outcome.detail);
  }

  if (results.totalVotes > 0) {
    const ranked = [...results.leaders, ...results.pack];
    lines.push("");
    ranked.forEach(({ option, votes, percent }) => {
      // Shared places for equal counts: 1, 2, 2, 4.
      const place = ranked.findIndex((entry) => entry.votes === votes) + 1;
      lines.push(`${place}. ${option.label} — ${standing(votes, percent)}`);
    });

    lines.push("");
    if (outcome.kind === "winner") {
      const backers = backersOf(results.leaders[0].option.id);
      if (backers.length > 0) lines.push(`Backed by ${peopleList(backers)}`);
    } else {
      for (const leader of results.leaders) {
        const backers = backersOf(leader.option.id);
        if (backers.length > 0) {
          lines.push(`${leader.option.label}: ${peopleList(backers)}`);
        }
      }
    }
  }

  lines.push(`Full result: ${shareUrl}`);
  return lines.join("\n");
}
