import type { ApiErrorBody } from "@/domain/errors";

export type ApiError = ApiErrorBody["error"] | { code: "NETWORK"; message: string };

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: ApiError };
