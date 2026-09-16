"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CreatorPollView } from "@/domain/views";
import {
  endVoting,
  fetchCreatorPoll,
  loginUrlForCurrentPage,
  moderateSuggestion,
  reopenVoting,
  type ModerationAction,
} from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/types";

/**
 * Everything the organiser's poll screens need from "the server". The real app
 * uses the HTTP API; guest mode swaps in an in-browser implementation, so the
 * same screens work in both without branching on mode.
 */
export type PollBackend = {
  fetchPoll(slug: string, signal?: AbortSignal): Promise<ApiResult<CreatorPollView>>;
  moderate(slug: string, optionId: string, action: ModerationAction): Promise<ApiResult<{ optionId: string; status: string }>>;
  endVoting(slug: string): Promise<ApiResult<unknown>>;
  reopenVoting(slug: string, closesAt: Date): Promise<ApiResult<unknown>>;
  /** Re-render the page after the poll's state changed underneath it. */
  refreshPage(): void;
  /** A session expired mid-action. */
  onUnauthenticated(): void;
};

const PollBackendContext = createContext<PollBackend | null>(null);

export function PollBackendProvider({ backend, children }: { backend: PollBackend; children: ReactNode }) {
  return <PollBackendContext.Provider value={backend}>{children}</PollBackendContext.Provider>;
}

/** The backend for this screen: the provided one (guest mode) or the real API. */
export function usePollBackend(): PollBackend {
  const provided = useContext(PollBackendContext);
  const router = useRouter();
  const api = useMemo<PollBackend>(
    () => ({
      fetchPoll: fetchCreatorPoll,
      moderate: moderateSuggestion,
      endVoting,
      reopenVoting,
      refreshPage: () => router.refresh(),
      onUnauthenticated: () => window.location.assign(loginUrlForCurrentPage()),
    }),
    [router],
  );
  return provided ?? api;
}
