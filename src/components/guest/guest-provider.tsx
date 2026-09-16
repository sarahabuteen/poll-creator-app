"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PollBackendProvider, type PollBackend } from "@/components/poll/poll-backend";
import { VoterBackendProvider, type VoterBackend } from "@/components/vote/voter-backend";
import type { ModerationAction } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/types";
import {
  guestApprove,
  guestCastBallot,
  guestDecline,
  guestEndVoting,
  guestReopenVoting,
  guestSuggest,
  guestUndo,
  guestViewerBallot,
  type GuestActionResult,
} from "@/lib/guest/actions";
import type { GuestData, GuestPoll } from "@/lib/guest/shift";
import { GUEST_STORAGE_KEY, GUEST_STORAGE_PREFIX, GUEST_VOTER_KEY, parseStoredGuest, type StoredGuest } from "@/lib/guest/storage";
import { guestCreatorView, guestPublicView } from "@/lib/guest/views";

type GuestContextValue = {
  data: GuestData;
  generatedAt: number;
  /** The real site, so copied links work. */
  appUrl: string;
  /** False until this browser's saved guest data has been read; pages with their own state wait for it. */
  ready: boolean;
  /** This browser's voter token in guest mode, once ready. */
  voterToken: string | null;
  /** Polls the guest ended themselves get a fresh reveal; sample results play once. */
  revealKeyFor: (slug: string) => string;
  /** Throw away every change and go back to the untouched sample polls. */
  startOver: () => void;
};

const GuestContext = createContext<GuestContextValue | null>(null);

export function useGuest(): GuestContextValue {
  const value = useContext(GuestContext);
  if (!value) throw new Error("useGuest must be used inside GuestProvider");
  return value;
}

/** For UI that also renders outside guest mode's data (the banner, when the samples failed to load). */
export function useOptionalGuest(): GuestContextValue | null {
  return useContext(GuestContext);
}

const notFound = <T,>(): ApiResult<T> => ({ ok: false, status: 404, error: { code: "POLL_NOT_FOUND", message: "Poll not found." } });

function readVoterToken(): string {
  try {
    const existing = localStorage.getItem(GUEST_VOTER_KEY);
    if (existing) return existing;
    const token = crypto.randomUUID();
    localStorage.setItem(GUEST_VOTER_KEY, token);
    return token;
  } catch {
    // No storage: one token for this page view, which is all it can remember anyway.
    return crypto.randomUUID();
  }
}

/**
 * Guest mode's "server": the sample polls, saved in this browser. Every action
 * runs the real rules against them and nothing reaches the database. Tabs
 * share the data, so a vote cast in one tab shows up live in the other.
 */
export function GuestProvider({ initial, generatedAt, appUrl, children }: { initial: GuestData; generatedAt: string; appUrl: string; children: ReactNode }) {
  const [data, setData] = useState(initial);
  const [ended, setEnded] = useState<readonly string[]>([]);
  const [ready, setReady] = useState(false);
  const [voterToken, setVoterToken] = useState<string | null>(null);
  // Actions read the latest state synchronously, even between renders.
  const latest = useRef<StoredGuest>({ savedAt: Date.parse(generatedAt), data: initial, ended: [] });
  const token = useRef<string | null>(null);

  const apply = useCallback((next: StoredGuest) => {
    latest.current = next;
    setData(next.data);
    setEnded(next.ended);
  }, []);

  const save = useCallback(
    (next: StoredGuest) => {
      apply(next);
      try {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private mode or full storage: this tab still works, it just won't share.
      }
    },
    [apply],
  );

  useEffect(() => {
    const load = setTimeout(() => {
      let stored: StoredGuest | null = null;
      try {
        stored = parseStoredGuest(localStorage.getItem(GUEST_STORAGE_KEY), Date.now());
      } catch {
        // No storage: start from the samples this page loaded with.
      }
      if (stored) apply(stored);
      else save(latest.current);
      token.current = readVoterToken();
      setVoterToken(token.current);
      setReady(true);
    }, 0);

    // Another tab changed the samples (a vote, a decision, Start over): take its copy.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== GUEST_STORAGE_KEY) return;
      // Started over in another tab: load the fresh samples here too.
      if (event.newValue === null) return window.location.reload();
      const stored = parseStoredGuest(event.newValue, Date.now());
      if (stored) apply(stored);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearTimeout(load);
      window.removeEventListener("storage", onStorage);
    };
  }, [apply, save]);

  const backends = useMemo(() => {
    const find = (slug: string) => latest.current.data.polls.find((poll) => poll.id === slug);
    const commit = (next: GuestPoll, endedKey?: string) =>
      save({
        savedAt: latest.current.savedAt,
        data: { ...latest.current.data, polls: latest.current.data.polls.map((poll) => (poll.id === next.id ? next : poll)) },
        ended: endedKey ? [...latest.current.ended, endedKey] : latest.current.ended,
      });
    const respond = <T,>(result: GuestActionResult, body: (poll: GuestPoll) => T, endedKey?: (poll: GuestPoll) => string): ApiResult<T> => {
      if (!result.ok) return { ok: false, status: 409, error: { code: result.code, message: result.message } };
      commit(result.poll, endedKey?.(result.poll));
      return { ok: true, status: 200, data: body(result.poll) };
    };

    const organiser: PollBackend = {
      async fetchPoll(slug) {
        const poll = find(slug);
        return poll ? { ok: true, status: 200, data: guestCreatorView(poll, new Date()) } : notFound();
      },
      async moderate(slug, optionId, action: ModerationAction) {
        const poll = find(slug);
        if (!poll) return notFound();
        const now = new Date();
        const result =
          action === "approve" ? guestApprove(poll, optionId, now) : action === "decline" ? guestDecline(poll, optionId, now) : guestUndo(poll, optionId, now);
        return respond(result, (next) => ({
          optionId,
          status: next.options.find((option) => option.id === optionId)?.suggestionStatus ?? "pending",
        }));
      },
      async endVoting(slug) {
        const poll = find(slug);
        if (!poll) return notFound();
        return respond(
          guestEndVoting(poll, new Date()),
          (next) => ({ status: next.status, settledAt: next.settledAt }),
          (next) => `${slug}:${next.settledAt}`,
        );
      },
      async reopenVoting(slug, closesAt) {
        const poll = find(slug);
        if (!poll) return notFound();
        return respond(guestReopenVoting(poll, closesAt, new Date()), (next) => ({ status: next.status, closesAt: next.closesAt }));
      },
      // State lives here, so screens re-render on their own.
      refreshPage: () => undefined,
      onUnauthenticated: () => undefined,
    };

    const voter: VoterBackend = {
      storagePrefix: GUEST_STORAGE_PREFIX,
      async fetchPoll(slug) {
        const poll = find(slug);
        return poll ? { ok: true, status: 200, data: guestPublicView(poll, new Date(), token.current) } : notFound();
      },
      async castBallot(slug, body) {
        const poll = find(slug);
        if (!poll || !token.current) return notFound();
        const voterToken = token.current;
        return respond(guestCastBallot(poll, { ...body, voterToken }, new Date()), (next) => {
          const ballot = guestViewerBallot(next, voterToken)!;
          return { ballotId: body.ballotId, optionIds: ballot.optionIds, castAt: ballot.castAt };
        });
      },
      async suggest(slug, body) {
        const poll = find(slug);
        if (!poll || !token.current) return notFound();
        const id = crypto.randomUUID();
        return respond(guestSuggest(poll, { ...body, id, voterToken: token.current }, new Date()), () => ({ id, status: "pending" as const }));
      },
    };

    return { organiser, voter };
  }, [save]);

  const startOver = useCallback(() => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(`${GUEST_STORAGE_PREFIX}:voted-as:`)) localStorage.removeItem(key);
      }
    } catch {
      // Nothing remembered to clear.
    }
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // Already gone.
    }
    // A full load fetches fresh samples, shifted to now; other tabs reload when they see the key go.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load is the point: fresh samples from the server
    window.location.assign("/guest");
  }, []);

  const value = useMemo<GuestContextValue>(
    () => ({
      data,
      generatedAt: Date.parse(generatedAt),
      appUrl,
      ready,
      voterToken,
      startOver,
      revealKeyFor: (slug) => {
        const poll = data.polls.find((item) => item.id === slug);
        const key = `${slug}:${poll?.settledAt}`;
        return ended.includes(key) ? `guest:${key}` : `guest:${slug}:sample`;
      },
    }),
    [data, generatedAt, appUrl, ready, voterToken, startOver, ended],
  );

  return (
    <GuestContext.Provider value={value}>
      <PollBackendProvider backend={backends.organiser}>
        <VoterBackendProvider backend={backends.voter}>{children}</VoterBackendProvider>
      </PollBackendProvider>
    </GuestContext.Provider>
  );
}
