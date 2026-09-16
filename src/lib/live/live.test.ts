import { describe, expect, it } from "vitest";
import type { CreatorPollView, SuggestionView } from "@/domain/views";
import { deriveResults, type ResultOption } from "@/lib/results";
import { isMeaningfulChange, raceSummary } from "./announce";
import { applyOverlays } from "./overlay";

const person = (name: string) => ({ name, avatar: { seed: name, tint: "cbe2d8" as const } });
const salads: SuggestionView = { id: "salads", label: "Just order salads", suggestedBy: person("Sam"), createdAt: "2026-09-17T10:00:00Z" };
const calzones: SuggestionView = { id: "calzones", label: "Calzones", suggestedBy: person("Rosa"), createdAt: "2026-09-17T11:00:00Z" };

const view: CreatorPollView = {
  audience: "creator",
  slug: "pizza-night",
  title: "Pizza night",
  voteType: "single",
  maxChoices: 1,
  suggestionsEnabled: true,
  status: "open",
  closesAt: "2026-09-17T18:00:00Z",
  settledAt: null,
  endedEarly: false,
  createdAt: "2026-09-17T08:00:00Z",
  options: [
    { id: "detroit", label: "Detroit-style", source: "creator", suggestedBy: null, votes: 5, backers: null },
    { id: "pepperoni", label: "Pepperoni", source: "creator", suggestedBy: null, votes: 3, backers: null },
  ],
  totalVotes: 8,
  voters: [],
  pendingSuggestions: [salads, calzones],
  undoableDecisions: [],
};

describe("applyOverlays", () => {
  it("returns the view untouched with nothing in flight", () => {
    expect(applyOverlays(view, [])).toBe(view);
  });

  it("moves an approved suggestion onto the ballot with 0 votes", () => {
    const next = applyOverlays(view, [{ suggestion: salads, to: "approved" }]);
    expect(next.pendingSuggestions.map((s) => s.id)).toEqual(["calzones"]);
    expect(next.options.at(-1)).toMatchObject({ id: "salads", votes: 0, suggestedBy: { name: "Sam" } });
  });

  it("doesn't duplicate an approval the server has already confirmed", () => {
    const confirmed = { ...view, pendingSuggestions: [calzones], options: [...view.options, { id: "salads", label: "Just order salads", source: "suggestion" as const, suggestedBy: person("Sam"), votes: 2, backers: null }] };
    const next = applyOverlays(confirmed, [{ suggestion: salads, to: "approved" }]);
    expect(next.options.filter((o) => o.id === "salads")).toEqual([expect.objectContaining({ votes: 2 })]);
  });

  it("hides a declined suggestion", () => {
    expect(applyOverlays(view, [{ suggestion: salads, to: "declined" }]).pendingSuggestions).toEqual([calzones]);
  });

  it("puts an undone suggestion back in pending, in the order it arrived", () => {
    const declinedOnServer = { ...view, pendingSuggestions: [calzones] };
    const next = applyOverlays(declinedOnServer, [{ suggestion: salads, to: "pending" }]);
    expect(next.pendingSuggestions.map((s) => s.id)).toEqual(["salads", "calzones"]);
  });

  it("pulls an undone approval back off the ballot", () => {
    const approvedOnServer = applyOverlays(view, [{ suggestion: salads, to: "approved" }]);
    const next = applyOverlays(approvedOnServer, [{ suggestion: salads, to: "pending" }]);
    expect(next.options.map((o) => o.id)).toEqual(["detroit", "pepperoni"]);
    expect(next.pendingSuggestions.map((s) => s.id)).toEqual(["salads", "calzones"]);
  });
});

const option = (id: string, votes: number): ResultOption => ({ id, label: id, suggestedBy: null, votes });

describe("race announcements", () => {
  it("summarises the lead, ties and an empty poll in words", () => {
    expect(raceSummary(deriveResults([option("Detroit", 5), option("Pepperoni", 3)]))).toBe("8 votes in. Detroit leads with 5, ahead by 2.");
    expect(raceSummary(deriveResults([option("Heat", 2), option("Jaws", 2)]))).toBe("4 votes in. Tied at 2 votes each: Heat and Jaws.");
    expect(raceSummary(deriveResults([option("A", 0)]))).toBe("No votes yet.");
  });

  it("only treats new votes or a new leader as worth announcing", () => {
    const before = deriveResults([option("a", 5), option("b", 3)]);
    expect(isMeaningfulChange(before, deriveResults([option("a", 5), option("b", 3), option("c", 0)]))).toBe(false);
    expect(isMeaningfulChange(before, deriveResults([option("a", 5), option("b", 4)]))).toBe(true);
    expect(isMeaningfulChange(before, deriveResults([option("a", 5), option("b", 5)]))).toBe(true);
  });
});
