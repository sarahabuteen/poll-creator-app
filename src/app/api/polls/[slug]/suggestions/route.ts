import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { suggestOptionInput } from "@/domain/inputs";
import { handle, parseBody, readJson } from "@/server/api/http";
import { suggestOption } from "@/server/polls/commands";

/** A voter suggests an option; it waits for the creator's decision. */
export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/polls/[slug]/suggestions">) => {
  const { slug } = await ctx.params;
  const input = parseBody(suggestOptionInput, await readJson(request));
  const { id } = await suggestOption(getDb(), slug, input);
  return NextResponse.json({ id, status: "pending" }, { status: 201 });
});
