import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { createPollInput } from "@/domain/inputs";
import { handle, parseBody, readJson } from "@/server/api/http";
import { requireCreatorId } from "@/server/api/session";
import { createPoll } from "@/server/polls/commands";
import { listCreatorPolls } from "@/server/polls/dashboard";

/** The signed-in creator's polls for the dashboard. */
export const GET = handle(async (request: NextRequest) => {
  const creatorId = await requireCreatorId(request);
  const polls = await listCreatorPolls(getDb(), creatorId);
  return NextResponse.json({ polls });
});

/** Create a poll; the response carries the slug for the share step. */
export const POST = handle(async (request: NextRequest) => {
  const creatorId = await requireCreatorId(request);
  const input = parseBody(createPollInput, await readJson(request));
  const { slug } = await createPoll(getDb(), creatorId, input);
  return NextResponse.json({ slug }, { status: 201 });
});
