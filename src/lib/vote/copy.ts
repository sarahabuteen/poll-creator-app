import type { Person } from "@/domain/views";
import { pluralVotes, type PollResults } from "@/lib/results";

/** "A", "A and B", "A, B and C". */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The ballot's one action restates the choice: "Cast my vote for Veggie supreme". */
export function castLabel(selectedLabels: readonly string[]): string {
  return selectedLabels.length === 0 ? "Cast my vote" : `Cast my vote for ${listNames(selectedLabels)}`;
}

/** "Priya, Ada, Kai + 2 more". Named people first; the rest as a count. */
export function peopleList(people: readonly Person[], shown = 3): string {
  if (people.length <= shown) return listNames(people.map((person) => person.name));
  return `${people
    .slice(0, shown)
    .map((person) => person.name)
    .join(", ")} + ${people.length - shown} more`;
}

/** "Priya, Ada, Kai + 2 more backed it". */
export function backersLine(backers: readonly Person[], shown = 3): string {
  return backers.length === 0 ? "Nobody backed it" : `${peopleList(backers, shown)} backed it`;
}

export type Outcome =
  | { kind: "winner"; headline: string; detail: string }
  | { kind: "tie"; headline: string; detail: string }
  | { kind: "empty"; headline: string; detail: string };

/** The result in words, including the outcome the product is named after. */
export function describeOutcome(results: PollResults): Outcome {
  const { leaders, totalVotes, margin } = results;
  if (leaders.length === 0) {
    return { kind: "empty", headline: "Nobody voted", detail: "The poll closed without a single vote." };
  }
  if (leaders.length > 1) {
    return {
      kind: "tie",
      headline: `It’s a tie: ${listNames(leaders.map((leader) => leader.option.label))}`,
      detail: `Tied at ${pluralVotes(leaders[0].votes)} each, out of ${totalVotes}`,
    };
  }
  const [winner] = leaders;
  return {
    kind: "winner",
    headline: `The crew picked ${winner.option.label}`,
    detail: `${winner.votes} of ${pluralVotes(totalVotes)}${margin > 0 ? ` \u00b7 ahead by ${margin}` : ""}`,
  };
}
