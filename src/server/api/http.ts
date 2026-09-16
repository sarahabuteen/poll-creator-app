import { NextResponse } from "next/server";
import { z } from "zod";
import { isPollRuleError, type ApiErrorBody, type ApiErrorCode, type PollRuleCode } from "@/domain/errors";

/** An HTTP-level refusal that isn't a poll rule (e.g. not signed in). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const STATUS_BY_RULE: Record<PollRuleCode, number> = {
  INVALID_INPUT: 400,
  INVALID_CHOICE: 422,
  CLOSING_TIME_INVALID: 422,
  DUPLICATE_OPTION: 422,
  TOO_MANY_OPTIONS: 422,
  POLL_NOT_FOUND: 404,
  SUGGESTION_NOT_FOUND: 404,
  POLL_SETTLED: 409,
  POLL_ALREADY_OPEN: 409,
  ALREADY_VOTED: 409,
  BALLOT_ID_CONFLICT: 409,
  SUGGESTIONS_DISABLED: 409,
  SUGGESTION_ALREADY_DECIDED: 409,
  UNDO_UNAVAILABLE: 409,
};

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (isPollRuleError(error)) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: STATUS_BY_RULE[error.code] });
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  // Never leak internals to a guest: log it, say something plain.
  console.error(error);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500 });
}

/** Runs a handler, turning thrown rule errors into JSON error responses. Responses are never cached. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<NextResponse>) {
  return async (...args: Args): Promise<NextResponse> => {
    let response: NextResponse;
    try {
      response = await fn(...args);
    } catch (error) {
      response = errorResponse(error);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_INPUT", "Request body must be JSON.");
  }
}

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "INVALID_INPUT", z.prettifyError(parsed.error));
  return parsed.data;
}
