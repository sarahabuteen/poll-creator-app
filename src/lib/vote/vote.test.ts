import { describe, expect, it } from "vitest";
import { deriveResults } from "@/lib/results";
import { formatSettled } from "@/lib/time";
import { backersLine, castLabel, describeOutcome, listNames } from "./copy";

const person = (name: string) => ({ name, avatar: { seed: name, tint: "cbe2d8" as const } });
const option = (label: string, votes: number) => ({ id: label, label, suggestedBy: null, votes });

describe("vote copy", () => {
  it("lists names like a person would", () => {
    expect([listNames([]), listNames(["A"]), listNames(["A", "B"]), listNames(["A", "B", "C"])]).toEqual(["", "A", "A and B", "A, B and C"]);
  });

  it("restates the choice on the cast button", () => {
    expect(castLabel([])).toBe("Cast my vote");
    expect(castLabel(["Veggie supreme"])).toBe("Cast my vote for Veggie supreme");
    expect(castLabel(["The Marlowe", "Franca's"])).toBe("Cast my vote for The Marlowe and Franca's");
  });

  it("credits backers by name, then as a count", () => {
    expect(backersLine([])).toBe("Nobody backed it");
    expect(backersLine(["Priya", "Ada"].map(person))).toBe("Priya and Ada backed it");
    expect(backersLine(["Priya", "Ada", "Kai", "Noor", "Theo"].map(person))).toBe("Priya, Ada, Kai + 2 more backed it");
  });

  it("describes a win, a tie and an empty poll in words", () => {
    expect(describeOutcome(deriveResults([option("Detroit", 5), option("Pepperoni", 3)]))).toEqual({
      kind: "winner",
      headline: "The crew picked Detroit",
      detail: "5 of 8 votes · ahead by 2",
    });
    expect(describeOutcome(deriveResults([option("Heat", 2), option("Jaws", 2)]))).toMatchObject({
      kind: "tie",
      headline: "It’s a tie: Heat and Jaws",
      detail: "Tied at 2 votes each, out of 4",
    });
    expect(describeOutcome(deriveResults([option("A", 0)])).kind).toBe("empty");
  });
});

describe("formatSettled", () => {
  const now = new Date(2026, 8, 17, 15, 0).getTime();
  it("says today, yesterday, a weekday, then a date", () => {
    expect(formatSettled(new Date(2026, 8, 17, 9, 5).getTime(), now)).toMatch(/^today at /);
    expect(formatSettled(new Date(2026, 8, 16, 21, 0).getTime(), now)).toMatch(/^yesterday at /);
    expect(formatSettled(new Date(2026, 8, 14, 12, 0).getTime(), now)).toMatch(/^on [A-Z][a-z]+day$/);
    expect(formatSettled(new Date(2026, 7, 1, 12, 0).getTime(), now)).toMatch(/^on 1 August$|^on August 1$/);
  });
});
