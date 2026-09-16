import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { PollRuleError } from "@/domain/errors";
import { handle } from "@/server/api/http";
import { requireCreatorId } from "@/server/api/session";
import { getCreatorPollView } from "@/server/polls/views";

/** The creator's view of their poll: results plus pending suggestions and undoable decisions. */
export const GET = handle(async (request: NextRequest, ctx: RouteContext<"/api/creator/polls/[slug]">) => {
  const creatorId = await requireCreatorId(request);
  const { slug } = await ctx.params;
  const view = await getCreatorPollView(getDb(), slug, { creatorId });
  if (!view) throw new PollRuleError("POLL_NOT_FOUND", "Poll not found.");
  return NextResponse.json(view);
});
