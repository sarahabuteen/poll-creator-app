import type { ApiErrorBody } from "@/domain/errors";
import type { CreatorPollView, Person, PublicPollView } from "@/domain/views";
import type { ApiResult } from "./types";

/** Calls the app's API from the browser. Never throws: failures come back as results. */
async function request<T>(path: `/api/${string}`, init: RequestInit = {}): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: init.cache ?? "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, status: 0, error: { code: "NETWORK", message: "Couldn’t reach the server." } };
  }

  const body = await response.json().catch(() => null);
  if (response.ok) return { ok: true, status: response.status, data: body as T };
  const error = (body as ApiErrorBody | null)?.error ?? { code: "INTERNAL" as const, message: "Something went wrong." };
  return { ok: false, status: response.status, error };
}

export type ModerationAction = "approve" | "decline" | "undo";

/**
 * `no-cache` lets the browser revalidate with the poll's ETag: when nothing
 * has changed the server answers 304 and fetch hands back the stored body.
 */
export function fetchCreatorPoll(slug: string, signal?: AbortSignal) {
  return request<CreatorPollView>(`/api/creator/polls/${encodeURIComponent(slug)}`, { signal, cache: "no-cache" });
}

export function moderateSuggestion(slug: string, optionId: string, action: ModerationAction) {
  return request<{ optionId: string; status: "approved" | "declined" | "pending" }>(
    `/api/creator/polls/${encodeURIComponent(slug)}/suggestions/${encodeURIComponent(optionId)}/${action}`,
    { method: "POST", body: "{}" },
  );
}

/** The public poll for voters. Revalidates with the ETag like the creator view. */
export function fetchPublicPoll(slug: string, signal?: AbortSignal) {
  return request<PublicPollView>(`/api/polls/${encodeURIComponent(slug)}`, { signal, cache: "no-cache" });
}

export type CastBallotBody = { ballotId: string; voter: Person; optionIds: string[] };

/** Casting is idempotent per ballotId, so retrying the same ballot never counts twice. */
export function castBallot(slug: string, body: CastBallotBody) {
  return request<{ ballotId: string; optionIds: string[]; castAt: string }>(
    `/api/polls/${encodeURIComponent(slug)}/ballots`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function suggestOption(slug: string, body: { label: string; suggestedBy: Person }) {
  return request<{ id: string; status: "pending" }>(`/api/polls/${encodeURIComponent(slug)}/suggestions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Where to send a creator whose session has expired, so they come back here after logging in. */
export function loginUrlForCurrentPage(): string {
  return `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;
}
