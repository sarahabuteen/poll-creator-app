import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Connection } from "@/db/connect";
import { polls } from "@/db/schema";
import { SAMPLE_CREATOR_ID } from "@/db/seed";
import { UNDO_WINDOW_MS } from "@/domain/rules";
import { createTestDb, minutes, NOW, optionIds, reseed, voter } from "@/test/db";
import {
  approveSuggestion,
  castBallot,
  declineSuggestion,
  endVoting,
  reopenVoting,
  suggestOption,
  undoModeration,
} from "./commands";
import { getPollVersion } from "./versions";

let connection: Connection;
const db = () => connection.db;
const owner = { slug: "pizza-night", creatorId: SAMPLE_CREATOR_ID };
const tag = async (now = NOW, audience: "public" | "creator" = "creator") =>
  (await getPollVersion(db(), "pizza-night", { audience, now }))!.etag;
const revision = async () =>
  (await db().select({ revision: polls.revision }).from(polls).where(eq(polls.slug, "pizza-night")))[0].revision;

beforeAll(async () => {
  connection = await createTestDb();
});
beforeEach(() => reseed(connection));
afterAll(() => connection.close());

describe("getPollVersion", () => {
  it("is stable while nothing changes", async () => {
    expect(await tag()).toBe(await tag(minutes(1)));
  });

  it("returns the owner so callers can check access before answering", async () => {
    expect(await getPollVersion(db(), "pizza-night", { audience: "creator", now: NOW })).toMatchObject({ creatorId: SAMPLE_CREATOR_ID });
    expect(await getPollVersion(db(), "nope", { audience: "creator", now: NOW })).toBeNull();
  });

  it("changes, and bumps the revision, on every kind of write", async () => {
    const ids = await optionIds(connection, "pizza-night");
    const salads = { ...owner, optionId: ids["Just order salads"] };
    const sam = { name: "Sam", avatar: { seed: "Sam", tint: "f6e0a4" as const } };

    const writes: Array<[string, () => Promise<unknown>]> = [
      ["vote", () => castBallot(db(), "pizza-night", { ...voter("Rosa"), optionIds: [ids["Margherita from Lupa"]] }, NOW)],
      ["suggest", () => suggestOption(db(), "pizza-night", { label: "Calzones", suggestedBy: sam }, NOW)],
      ["decline", () => declineSuggestion(db(), salads, NOW)],
      ["undo", () => undoModeration(db(), salads, NOW)],
      ["approve", () => approveSuggestion(db(), salads, NOW)],
      ["end", () => endVoting(db(), owner, NOW)],
      ["reopen", () => reopenVoting(db(), { ...owner, closesAt: minutes(60) }, NOW)],
    ];

    const seen = new Set([await tag()]);
    let lastRevision = await revision();
    for (const [name, write] of writes) {
      await write();
      const next = await tag();
      expect(seen.has(next), `${name} should change the tag`).toBe(false);
      seen.add(next);
      expect(await revision(), `${name} should bump the revision`).toBe(lastRevision + 1);
      lastRevision += 1;
    }
  });

  it("changes when the closing time passes, with no write", async () => {
    // Pizza night closes three hours after the seeded "now".
    expect(await tag(minutes(179))).not.toBe(await tag(minutes(180)));
  });

  it("changes for the creator when an undo window closes, but not for the public", async () => {
    const ids = await optionIds(connection, "pizza-night");
    await declineSuggestion(db(), { ...owner, optionId: ids["Just order salads"] }, NOW);

    const justInside = new Date(NOW.getTime() + UNDO_WINDOW_MS);
    const justAfter = new Date(NOW.getTime() + UNDO_WINDOW_MS + 1);
    expect(await tag(justInside)).not.toBe(await tag(justAfter));
    expect(await tag(justInside, "public")).toBe(await tag(justAfter, "public"));
  });

  it("differs between audiences, so a cached creator view is never reused as a public one", async () => {
    expect(await tag(NOW, "creator")).not.toBe(await tag(NOW, "public"));
  });
});
