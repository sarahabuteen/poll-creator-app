"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { PollBackendProvider, type PollBackend } from "@/components/poll/poll-backend";
import type { ModerationAction } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/types";
import {
  guestApprove,
  guestDecline,
  guestEndVoting,
  guestReopenVoting,
  guestUndo,
  type GuestActionResult,
} from "@/lib/guest/actions";
import type { GuestData, GuestPoll } from "@/lib/guest/shift";
import { guestCreatorView } from "@/lib/guest/views";

type GuestContextValue = {
  data: GuestData;
  generatedAt: number;
  /** Polls the guest ended themselves this session get a fresh reveal; sample results play once. */
  revealKeyFor: (slug: string) => string;
};

const GuestContext = createContext<GuestContextValue | null>(null);

export function useGuest(): GuestContextValue {
  const value = useContext(GuestContext);
  if (!value) throw new Error("useGuest must be used inside GuestProvider");
  return value;
}

const notFound = <T,>(): ApiResult<T> => ({ ok: false, status: 404, error: { code: "POLL_NOT_FOUND", message: "Poll not found." } });

/**
 * Guest mode's "server": the sample data held in this tab. Every action runs
 * the real rules against it and nothing is saved, so a reload starts fresh.
 */
export function GuestProvider({ initial, generatedAt, children }: { initial: GuestData; generatedAt: string; children: ReactNode }) {
  const [data, setData] = useState(initial);
  // Actions read the latest state synchronously, even between renders.
  const latest = useRef(initial);
  const [endedInSession, setEndedInSession] = useState<ReadonlySet<string>>(new Set());

  const backend = useMemo<PollBackend>(() => {
    const find = (slug: string) => latest.current.polls.find((poll) => poll.id === slug);
    const commit = (next: GuestPoll) => {
      latest.current = { ...latest.current, polls: latest.current.polls.map((poll) => (poll.id === next.id ? next : poll)) };
      setData(latest.current);
    };
    const respond = <T,>(result: GuestActionResult, body: (poll: GuestPoll) => T): ApiResult<T> => {
      if (!result.ok) return { ok: false, status: 409, error: { code: result.code, message: result.message } };
      commit(result.poll);
      return { ok: true, status: 200, data: body(result.poll) };
    };

    return {
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
        const response = respond(guestEndVoting(poll, new Date()), (next) => ({ status: next.status, settledAt: next.settledAt }));
        if (response.ok) setEndedInSession((current) => new Set(current).add(slug));
        return response;
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
  }, []);

  const value = useMemo<GuestContextValue>(
    () => ({
      data,
      generatedAt: Date.parse(generatedAt),
      revealKeyFor: (slug) => {
        const poll = data.polls.find((item) => item.id === slug);
        return endedInSession.has(slug) ? `guest:${slug}:${poll?.settledAt}` : `guest:${slug}:sample`;
      },
    }),
    [data, generatedAt, endedInSession],
  );

  return (
    <GuestContext.Provider value={value}>
      <PollBackendProvider backend={backend}>{children}</PollBackendProvider>
    </GuestContext.Provider>
  );
}
