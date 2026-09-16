import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { PollRuleError } from "@/domain/errors";
import { handle, isNotModified, notModified, revalidateWith } from "@/server/api/http";
import { readVoterToken } from "@/server/api/session";
import { getPollVersion } from "@/server/polls/versions";
import { getPublicPollView } from "@/server/polls/views";

/**
 * The public poll: counts while open, attribution once settled, plus this
 * browser's own ballot. Answers 304 when the caller's copy is still current.
 */
export const GET = handle(async (request: NextRequest, ctx: RouteContext<"/api/polls/[slug]">) => {
  const { slug } = await ctx.params;
  const db = getDb();

  // Version first, view second: a write landing in between can only make the
  // body newer than its tag, which the next request corrects. Never staler.
  const version = await getPollVersion(db, slug, { audience: "public" });
  if (!version) throw new PollRuleError("POLL_NOT_FOUND", "Poll not found.");
  if (isNotModified(request, version.etag)) return notModified(version.etag);

  const view = await getPublicPollView(db, slug, { voterToken: readVoterToken(request) });
  if (!view) throw new PollRuleError("POLL_NOT_FOUND", "Poll not found.");
  return revalidateWith(NextResponse.json(view), version.etag);
});
