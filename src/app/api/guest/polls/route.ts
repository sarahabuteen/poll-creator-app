import { NextResponse } from "next/server";
import raw from "../../../../../data/sample-polls.json";
import type { SampleData } from "@/db/sample-types";
import { shiftSampleData } from "@/lib/guest/shift";
import { handle } from "@/server/api/http";

/**
 * GET /api/guest/polls: the sample dataset for guest mode, with timestamps
 * shifted to this moment so the story is always current (pizza night always
 * "closes today"). Public and read-only.
 *
 * Unlike the real poll APIs this includes who voted for what on open polls:
 * guest mode plays "End voting" and the reveal in the browser, and every name
 * here is invented sample data, never a real voter.
 */
export const GET = handle(async () => {
  const now = Date.now();
  return NextResponse.json({ ...shiftSampleData(raw as SampleData, now), generatedAt: new Date(now).toISOString() });
});
