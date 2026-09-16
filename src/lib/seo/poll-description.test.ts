import { describe, expect, it } from "vitest";
import type { BallotOptionView } from "@/domain/views";
import { pollDescription } from "./poll-description";

const option = (label: string, votes: number): BallotOptionView => ({
  id: label,
  label,
  source: "creator",
  suggestedBy: null,
  votes,
  backers: null,
});

describe("pollDescription", () => {
  it("never mentions counts while voting is open", () => {
    const text = pollDescription({ title: "Film night", status: "open", totalVotes: 7, options: [option("Dune", 5), option("Up", 2)] });
    expect(text).toBe("Vote on “Film night”: 2 options to choose from. Just a name and a face, no account needed.");
    expect(text).not.toMatch(/\d vote/);
  });

  it("names the winner with the count once settled", () => {
    expect(
      pollDescription({ title: "Pizza night", status: "settled", totalVotes: 11, options: [option("Detroit", 5), option("Pepperoni", 3), option("Veggie", 3)] }),
    ).toBe("The crew picked Detroit for “Pizza night”, with 5 of 11 votes.");
  });

  it("states a tie in words", () => {
    expect(
      pollDescription({ title: "Brunch", status: "settled", totalVotes: 6, options: [option("Café A", 2), option("Café B", 2), option("Café C", 2)] }),
    ).toBe("It’s a tie on “Brunch”: Café A, Café B and Café C, with 2 votes each.");
  });

  it("handles a poll that closed without votes", () => {
    expect(pollDescription({ title: "Picnic", status: "settled", totalVotes: 0, options: [option("Park", 0)] })).toBe(
      "Voting on “Picnic” has closed with no votes cast.",
    );
  });
});
