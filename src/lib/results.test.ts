import { describe, expect, it } from "vitest";
import raw from "../../data/sample-polls.json";
import type { SampleData, SamplePoll } from "@/db/sample-types";
import { deriveResults, raceCall, type ResultOption } from "./results";

/** Sample polls as the ballot-with-counts the server sends (pending suggestions left off). */
function ballotOf(poll: SamplePoll): ResultOption[] {
  return poll.options
    .filter((option) => option.source === "creator" || option.suggestionStatus === "approved")
    .map((option) => ({
      id: option.id,
      label: option.label,
      suggestedBy: option.suggestedBy ?? null,
      votes: poll.votes.filter((vote) => vote.optionId === option.id).length,
    }));
}

const sample = (id: string) => ballotOf((raw as SampleData).polls.find((poll) => poll.id === id)!);

describe("deriveResults", () => {
  it("matches the preview for pizza night", () => {
    const results = deriveResults(sample("pizza-night"));

    expect(results.totalVotes).toBe(11);
    expect(results.leaders.map((r) => [r.option.id, r.votes, r.percent])).toEqual([["detroit", 5, 45]]);
    expect(results.pack.map((r) => [r.option.id, r.votes, r.percent, r.relativeWidth])).toEqual([
      ["pepperoni", 3, 27, 60],
      ["veggie", 2, 18, 40],
      ["margherita", 1, 9, 20],
    ]);
    expect(results.margin).toBe(2);
    expect(raceCall(results)).toBe("still anyone’s game");
  });

  it("flags ties in the pack", () => {
    const { pack } = deriveResults(sample("friday-film-club"));
    expect(pack.map((r) => [r.option.id, r.tied])).toEqual([
      ["heat", true],
      ["eeaao", true],
    ]);
  });

  it("names no leader before the first vote", () => {
    const results = deriveResults(sample("birthday-brunch"));
    expect(results.leaders).toEqual([]);
    expect(results.pack.every((r) => r.votes === 0 && r.relativeWidth === 0)).toBe(true);
    expect(raceCall(results)).toBe("waiting on the first vote");
  });

  it("states a tie at the top in words instead of picking a winner", () => {
    // Without Jaws's 3 votes, Heat and Everything Everywhere are level at 2 each.
    const twoTwo = sample("friday-film-club").filter((option) => option.id !== "jaws");
    const results = deriveResults(twoTwo);

    expect(results.leaders).toHaveLength(2);
    expect(results.margin).toBe(0);
    expect(raceCall(results)).toBe("tied at 2 votes each");
  });
});
