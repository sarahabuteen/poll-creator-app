import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { PollRuleError } from "@/domain/errors";
import { handle } from "@/server/api/http";
import { requireCreatorId } from "@/server/api/session";
import { approveSuggestion, declineSuggestion, undoModeration } from "@/server/polls/commands";

const actions = { approve: approveSuggestion, decline: declineSuggestion, undo: undoModeration };

/** POST …/approve ("Add it"), …/decline ("Not this time") or …/undo (the undo toast). */
export const POST = handle(
  async (request: NextRequest, ctx: RouteContext<"/api/creator/polls/[slug]/suggestions/[optionId]/[action]">) => {
    const creatorId = await requireCreatorId(request);
    const { slug, optionId, action } = await ctx.params;
    if (!Object.hasOwn(actions, action) || !z.uuid().safeParse(optionId).success) {
      throw new PollRuleError("SUGGESTION_NOT_FOUND", "Suggestion not found.");
    }

    const result = await actions[action as keyof typeof actions](getDb(), { slug, creatorId, optionId });
    return NextResponse.json({ optionId: result.optionId, status: result.status });
  },
);
