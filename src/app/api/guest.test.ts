import { describe, expect, it } from "vitest";
import type { GuestData } from "@/lib/guest/shift";
import { GET } from "./guest/polls/route";

describe("GET /api/guest/polls", () => {
  it("serves the sample polls, public and shifted to now, without touching the database", async () => {
    const before = Date.now();
    const response = await GET();
    const body = (await response.json()) as GuestData & { generatedAt: string };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.creator.name).toBe("Morgan");
    expect(body.polls.map((poll) => poll.id)).toEqual(["pizza-night", "friday-film-club", "meal-out", "lake-weekend", "birthday-brunch"]);

    // Pizza night always closes three hours from the moment it's requested.
    const closesIn = Date.parse(body.polls[0].closesAt) - Date.parse(body.generatedAt);
    expect(closesIn).toBe(3 * 60 * 60_000);
    expect(Date.parse(body.generatedAt)).toBeGreaterThanOrEqual(before);
  });
});
