"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicPollView } from "@/domain/views";
import { castBallot, fetchPublicPoll, suggestOption, type CastBallotBody } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/types";

/**
 * Everything the vote page needs from "the server". The real page uses the
 * HTTP API; guest mode swaps in its in-browser sample data, so voters in guest
 * mode get the very same screen.
 */
export type VoterBackend = {
  fetchPoll(slug: string, signal?: AbortSignal): Promise<ApiResult<PublicPollView>>;
  castBallot(slug: string, body: CastBallotBody): Promise<ApiResult<{ ballotId: string; optionIds: string[]; castAt: string }>>;
  suggest(slug: string, body: { label: string; suggestedBy: CastBallotBody["voter"] }): Promise<ApiResult<{ id: string; status: "pending" }>>;
  /** Prefix for what this browser remembers locally, so guest votes never mix with real ones. */
  storagePrefix: string;
};

const api: VoterBackend = {
  fetchPoll: fetchPublicPoll,
  castBallot,
  suggest: suggestOption,
  storagePrefix: "tiebreak",
};

const VoterBackendContext = createContext<VoterBackend>(api);

export function VoterBackendProvider({ backend, children }: { backend: VoterBackend; children: ReactNode }) {
  return <VoterBackendContext.Provider value={backend}>{children}</VoterBackendContext.Provider>;
}

export function useVoterBackend(): VoterBackend {
  return useContext(VoterBackendContext);
}
