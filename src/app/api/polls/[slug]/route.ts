import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { PollRuleError } from "@/domain/errors";
import { handle } from "@/server/api/http";
import { readVoterToken } from "@/server/api/session";
import { getPublicPollView } from "@/server/polls/views";

/** The public poll: counts while open, attribution once settled, plus this browser's own ballot. */
export const GET = handle(async (request: NextRequest, ctx: RouteContext<"/api/polls/[slug]">) => {
  const { slug } = await ctx.params;
  const view = await getPublicPollView(getDb(), slug, { voterToken: readVoterToken(request) });
  if (!view) throw new PollRuleError("POLL_NOT_FOUND", "Poll not found.");
  return NextResponse.json(view);
});
