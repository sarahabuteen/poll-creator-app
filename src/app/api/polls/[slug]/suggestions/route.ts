import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { suggestOptionInput } from "@/domain/inputs";
import { handle, parseBody, readJson } from "@/server/api/http";
import { enforceRateLimits, SUGGEST_LIMITS } from "@/server/api/rate-limit";
import { setVoterCookie, voterTokenFor } from "@/server/api/session";
import { suggestOption } from "@/server/polls/commands";

// The voter token comes from the cookie, never the body.
const body = suggestOptionInput.omit({ voterToken: true });

/** A voter suggests an option; it waits for the creator's decision. */
export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/polls/[slug]/suggestions">) => {
  const { slug } = await ctx.params;
  const input = parseBody(body, await readJson(request));
  const { token, isNew } = voterTokenFor(request);
  const db = getDb();

  await enforceRateLimits(db, request, { scope: `suggest:${slug}`, voterToken: token, limits: SUGGEST_LIMITS });
  const { id } = await suggestOption(db, slug, { ...input, voterToken: token });

  const response = NextResponse.json({ id, status: "pending" }, { status: 201 });
  if (isNew) setVoterCookie(response, token);
  return response;
});
