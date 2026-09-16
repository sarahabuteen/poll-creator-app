import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { handle, parseBody, readJson } from "@/server/api/http";
import { requireCreatorId } from "@/server/api/session";
import { reopenVoting } from "@/server/polls/commands";

const body = z.object({ closesAt: z.coerce.date() });

export type ReopenVotingRequest = z.input<typeof body>;

export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/creator/polls/[slug]/reopen">) => {
  const creatorId = requireCreatorId();
  const { slug } = await ctx.params;
  const { closesAt } = parseBody(body, await readJson(request));
  const next = await reopenVoting(getDb(), { slug, creatorId, closesAt });
  return NextResponse.json({ status: next.status, closesAt: next.closesAt.toISOString() });
});
