import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { handle } from "@/server/api/http";
import { requireCreatorId } from "@/server/api/session";
import { endVoting } from "@/server/polls/commands";

export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/creator/polls/[slug]/end">) => {
  const creatorId = await requireCreatorId(request);
  const { slug } = await ctx.params;
  const next = await endVoting(getDb(), { slug, creatorId });
  return NextResponse.json({ status: next.status, settledAt: next.settledAt?.toISOString() ?? null });
});
