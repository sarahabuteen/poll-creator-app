import type { GuestData } from "./shift";

/**
 * Guest mode keeps its sample polls in this browser's localStorage, so a vote
 * link opened in another tab sees the same polls, and a change in one tab
 * reaches the others. Nothing is ever sent to the server.
 */
export const GUEST_STORAGE_KEY = "tiebreak:guest:v1";
export const GUEST_VOTER_KEY = "tiebreak:guest:voter-token";
/** What the vote page remembers under, kept apart from real polls with the same slugs. */
export const GUEST_STORAGE_PREFIX = "tiebreak:guest";

/** Sample timestamps are shifted to the visit; after a while the story goes stale, so start fresh. */
const MAX_AGE_MS = 12 * 60 * 60_000;

export type StoredGuest = {
  savedAt: number;
  data: GuestData;
  /** Polls this guest ended themselves (slug:settledAt), which get a fresh reveal. */
  ended: string[];
};

export function parseStoredGuest(value: string | null, now: number): StoredGuest | null {
  if (!value) return null;
  try {
    const stored = JSON.parse(value) as StoredGuest;
    const valid =
      typeof stored?.savedAt === "number" &&
      Array.isArray(stored.data?.polls) &&
      typeof stored.data.creator?.name === "string" &&
      Array.isArray(stored.ended);
    return valid && now - stored.savedAt <= MAX_AGE_MS ? stored : null;
  } catch {
    return null;
  }
}
