import { and, eq, gte, ne, sql } from "drizzle-orm";
import type { Db } from "@/db/connect";
import { options, polls } from "@/db/schema";
import { effectiveState, UNDO_WINDOW_MS } from "@/domain/rules";

export type PollVersion = {
  pollId: string;
  creatorId: string;
  /** A weak ETag that changes whenever the poll's view would. */
  etag: string;
};

/**
 * One small query that says whether a poll's view has changed, so polling
 * clients can get a 304 instead of the whole poll.
 *
 * Views change on writes (tracked by `revision`) and with the clock alone:
 * a poll settles when its closing time passes, and a moderation decision
 * leaves the undo list when its window closes. Both are part of the tag, so
 * it changes at exactly those moments too.
 */
export async function getPollVersion(
  db: Db,
  slug: string,
  { audience, now = new Date() }: { audience: "public" | "creator"; now?: Date },
): Promise<PollVersion | null> {
  const undoCutoff = new Date(now.getTime() - UNDO_WINDOW_MS);
  const undoable = db
    .select({ value: sql<number>`count(*)::int` })
    .from(options)
    .where(and(eq(options.pollId, polls.id), gte(options.decidedAt, undoCutoff), ne(options.suggestionStatus, "pending")));

  const [row] = await db
    .select({
      id: polls.id,
      creatorId: polls.creatorId,
      revision: polls.revision,
      status: polls.status,
      closesAt: polls.closesAt,
      settledAt: polls.settledAt,
      undoable: sql<number>`(${undoable})`,
    })
    .from(polls)
    .where(eq(polls.slug, slug))
    .limit(1);
  if (!row) return null;

  const { status } = effectiveState(row, now);
  // The public view never lists undoable decisions, so it doesn't vary with them.
  const undoPart = audience === "creator" ? `-u${row.undoable}` : "";
  return {
    pollId: row.id,
    creatorId: row.creatorId,
    etag: `W/"${audience}-${row.id}-r${row.revision}-${status}${undoPart}"`,
  };
}
