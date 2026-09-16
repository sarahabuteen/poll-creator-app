import type { ApiErrorBody } from "@/domain/errors";
import type { CreatorPollView } from "@/domain/views";
import type { ApiResult } from "./types";

/** Calls the app's API from the browser. Never throws: failures come back as results. */
async function request<T>(path: `/api/${string}`, init: RequestInit = {}): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
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

export function fetchCreatorPoll(slug: string, signal?: AbortSignal) {
  return request<CreatorPollView>(`/api/creator/polls/${encodeURIComponent(slug)}`, { signal });
}

export function moderateSuggestion(slug: string, optionId: string, action: ModerationAction) {
  return request<{ optionId: string; status: "approved" | "declined" | "pending" }>(
    `/api/creator/polls/${encodeURIComponent(slug)}/suggestions/${encodeURIComponent(optionId)}/${action}`,
    { method: "POST", body: "{}" },
  );
}

/** Where to send a creator whose session has expired, so they come back here after logging in. */
export function loginUrlForCurrentPage(): string {
  return `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;
}
