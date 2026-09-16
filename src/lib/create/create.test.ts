import { describe, expect, it } from "vitest";
import { closingTimeError, defaultClosingPick, fromDateTimeLocal, quickClosingPicks, toDateTimeLocal } from "./closing";
import { filledOptions, hasErrors, validateCreatePoll, type CreatePollValues } from "./validation";

const afternoon = new Date(2026, 8, 16, 14, 0);
const lateEvening = new Date(2026, 8, 16, 20, 30);

describe("quickClosingPicks", () => {
  it("offers tonight while there's at least an hour to go, and defaults to it", () => {
    const picks = quickClosingPicks(afternoon);
    expect(picks.map((pick) => pick.id)).toEqual(["in-1-hour", "tonight", "tomorrow-noon", "in-3-days"]);
    expect(picks[1].closesAt).toEqual(new Date(2026, 8, 16, 21, 0));
    expect(defaultClosingPick(picks)).toBe("tonight");
  });

  it("drops tonight late in the evening and defaults to tomorrow at noon", () => {
    const picks = quickClosingPicks(lateEvening);
    expect(picks.map((pick) => pick.id)).not.toContain("tonight");
    expect(picks.find((pick) => pick.id === "tomorrow-noon")?.closesAt).toEqual(new Date(2026, 8, 17, 12, 0));
    expect(defaultClosingPick(picks)).toBe("tomorrow-noon");
  });

  it("round-trips datetime-local values in local time", () => {
    const date = new Date(2026, 8, 18, 19, 30);
    expect(toDateTimeLocal(date)).toBe("2026-09-18T19:30");
    expect(fromDateTimeLocal("2026-09-18T19:30")).toEqual(date);
    expect(fromDateTimeLocal("nonsense")).toBeNull();
  });

  it("keeps closing times between 5 minutes and 30 days out", () => {
    expect(closingTimeError(null, afternoon)).toMatch(/Pick a date/);
    expect(closingTimeError(new Date(afternoon.getTime() + 60_000), afternoon)).toMatch(/at least 5 minutes/);
    expect(closingTimeError(new Date(afternoon.getTime() + 31 * 86_400_000), afternoon)).toMatch(/30 days/);
    expect(closingTimeError(new Date(afternoon.getTime() + 3_600_000), afternoon)).toBeUndefined();
  });
});

describe("validateCreatePoll", () => {
  const valid: CreatePollValues = {
    title: "Pizza night: what are we ordering?",
    options: ["Detroit-style", "Pepperoni", ""],
    voteType: "single",
    maxChoices: 2,
    suggestionsEnabled: true,
    closesAt: new Date(afternoon.getTime() + 3_600_000),
  };

  it("accepts a valid poll, ignoring blank option rows", () => {
    expect(hasErrors(validateCreatePoll(valid, afternoon))).toBe(false);
    expect(filledOptions(valid.options)).toEqual(["Detroit-style", "Pepperoni"]);
  });

  it("needs a title and at least two filled options", () => {
    const errors = validateCreatePoll({ ...valid, title: " ", options: ["Only one", "  "] }, afternoon);
    expect(errors.title).toBeDefined();
    expect(errors.options).toBe("Add at least 2 options to choose between.");
  });

  it("flags the repeated row, ignoring case and spacing", () => {
    const errors = validateCreatePoll({ ...valid, options: ["Thai", "Pizza", "  thai "] }, afternoon);
    expect(errors.optionRows).toEqual({ 2: "That option is already on the list." });
  });

  it("keeps pick-up-to-N between 2 and the number of options", () => {
    expect(validateCreatePoll({ ...valid, voteType: "multi", maxChoices: 3 }, afternoon).maxChoices).toBe("Let people pick between 2 and 2.");
    expect(validateCreatePoll({ ...valid, voteType: "multi", maxChoices: 2 }, afternoon).maxChoices).toBeUndefined();
    // Single-vote polls ignore the number entirely.
    expect(validateCreatePoll({ ...valid, voteType: "single", maxChoices: 99 }, afternoon).maxChoices).toBeUndefined();
  });
});
