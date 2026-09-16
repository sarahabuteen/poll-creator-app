import { describe, expect, it } from "vitest";
import { buildResultText } from "./result-text";

const person = (name: string) => ({ name, avatar: { seed: name, tint: "cbe2d8" as const } });
const people = (...names: string[]) => names.map(person);
const option = (id: string, label: string, backers: string[]) => ({ id, label, suggestedBy: null, votes: backers.length, backers: people(...backers) });
const url = "https://tiebreak.app/p/pizza-night";

describe("buildResultText", () => {
  it("writes the winner, the full standings with counts, the backers and the link", () => {
    const text = buildResultText({
      title: "Pizza night: what are we ordering?",
      shareUrl: url,
      options: [
        option("pep", "Pepperoni from Slice House", ["Lena", "Marcus", "Bo"]),
        option("det", "Detroit-style from Emmy's", ["Priya", "Ada", "Kai", "Noor", "Theo"]),
        option("veg", "Veggie supreme from Nino's", ["Jonah", "Elif"]),
        option("mar", "Margherita from Lupa", ["Sam"]),
      ],
    });

    expect(text).toBe(
      [
        "Pizza night: what are we ordering?",
        "The crew picked Detroit-style from Emmy's",
        "5 of 11 votes (45%), ahead by 2",
        "",
        "1. Detroit-style from Emmy's — 5 votes (45%)",
        "2. Pepperoni from Slice House — 3 votes (27%)",
        "3. Veggie supreme from Nino's — 2 votes (18%)",
        "4. Margherita from Lupa — 1 vote (9%)",
        "",
        "Backed by Priya, Ada, Kai + 2 more",
        "Full result: https://tiebreak.app/p/pizza-night",
      ].join("\n"),
    );
  });

  it("names a tie, shares places, and credits each tied side", () => {
    const text = buildResultText({
      title: "Film club",
      shareUrl: url,
      options: [option("heat", "Heat", ["Ada", "Bo"]), option("jaws", "Jaws", ["Kai", "Noor"]), option("alien", "Alien", ["Sam"])],
    });

    expect(text).toContain("It’s a tie: Heat and Jaws\nTied at 2 votes each, out of 5");
    expect(text).toContain("1. Heat — 2 votes (40%)\n1. Jaws — 2 votes (40%)\n3. Alien — 1 vote (20%)");
    expect(text).toContain("Heat: Ada and Bo\nJaws: Kai and Noor");
  });

  it("stays short when nobody voted", () => {
    expect(buildResultText({ title: "Brunch", shareUrl: url, options: [option("a", "The Marlowe", [])] })).toBe(
      "Brunch\nNobody voted\nFull result: https://tiebreak.app/p/pizza-night",
    );
  });
});
