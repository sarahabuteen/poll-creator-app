import "server-only";

import { headers } from "next/headers";
import type { ApiErrorBody } from "@/domain/errors";
import type { ApiResult } from "./types";

export type { ApiResult };

/**
 * Calls this app's own API from a Server Component, as the browser would:
 * same origin, forwarding the visitor's cookies (voter token, and the auth
 * session from scope 2). Pages never read the database directly.
 */
export async function serverApi<T>(path: `/api/${string}`, init?: RequestInit): Promise<ApiResult<T>> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
  const protocol = incoming.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const cookie = incoming.get("cookie");

  const response = await fetch(`${protocol}://${host}${path}`, {
    ...init,
    cache: "no-store",
    headers: { accept: "application/json", ...(cookie ? { cookie } : {}), ...init?.headers },
  });

  // Not every failure has our JSON error body (e.g. a 405 or a platform error page).
  const body = await response.json().catch(() => null);
  if (response.ok) return { ok: true, status: response.status, data: body as T };
  const error = (body as ApiErrorBody | null)?.error ?? { code: "INTERNAL" as const, message: `Request failed (${response.status}).` };
  return { ok: false, status: response.status, error };
}
