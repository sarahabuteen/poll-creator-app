import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { PollRuleError } from "@/domain/errors";
import { handle, isNotModified, notModified, revalidateWith } from "@/server/api/http";
import { requireCreatorId } from "@/server/api/session";
import { getPollVersion } from "@/server/polls/versions";
import { getCreatorPollView } from "@/server/polls/views";

/**
 * The creator's view of their poll: results plus pending suggestions and
 * undoable decisions. Polled every few seconds, so it answers 304 when the
 * caller's copy is still current (one small query instead of the full load).
 */
export const GET = handle(async (request: NextRequest, ctx: RouteContext<"/api/creator/polls/[slug]">) => {
  // Auth before anything else: a 304 must not confirm a poll exists to a stranger.
  const creatorId = await requireCreatorId(request);
  const { slug } = await ctx.params;
  const db = getDb();

  // Version first, view second: a write landing in between can only make the
  // body newer than its tag, which the next request corrects. Never staler.
  const version = await getPollVersion(db, slug, { audience: "creator" });
  if (!version || version.creatorId !== creatorId) throw new PollRuleError("POLL_NOT_FOUND", "Poll not found.");
  if (isNotModified(request, version.etag)) return notModified(version.etag);

  const view = await getCreatorPollView(db, slug, { creatorId });
  if (!view) throw new PollRuleError("POLL_NOT_FOUND", "Poll not found.");
  return revalidateWith(NextResponse.json(view), version.etag);
});
