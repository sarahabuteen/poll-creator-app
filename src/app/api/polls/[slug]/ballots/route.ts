import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { castBallotInput } from "@/domain/inputs";
import { handle, parseBody, readJson } from "@/server/api/http";
import { CAST_LIMITS, enforceRateLimits } from "@/server/api/rate-limit";
import { setVoterCookie, voterTokenFor } from "@/server/api/session";
import { castBallot } from "@/server/polls/commands";

// The voter token comes from the cookie, never the body.
const body = castBallotInput.omit({ voterToken: true });

export type CastBallotRequest = z.input<typeof body>;

/** Cast a vote. 201 when recorded, 200 when this exact ballot was already recorded (a safe retry). */
export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/polls/[slug]/ballots">) => {
  const { slug } = await ctx.params;
  const input = parseBody(body, await readJson(request));
  const { token, isNew } = voterTokenFor(request);
  const db = getDb();

  await enforceRateLimits(db, request, { scope: `cast:${slug}`, voterToken: token, limits: CAST_LIMITS });
  const result = await castBallot(db, slug, { ...input, voterToken: token });

  const response = NextResponse.json(
    { ballotId: result.ballotId, optionIds: result.optionIds, castAt: result.castAt.toISOString() },
    { status: result.replayed ? 200 : 201 },
  );
  if (isNew) setVoterCookie(response, token);
  return response;
});
