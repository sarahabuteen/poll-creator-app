export type PollRuleCode =
  | "INVALID_INPUT"
  | "POLL_NOT_FOUND"
  | "POLL_SETTLED"
  | "POLL_ALREADY_OPEN"
  | "CLOSING_TIME_INVALID"
  | "ALREADY_VOTED"
  | "BALLOT_ID_CONFLICT"
  | "INVALID_CHOICE"
  | "SUGGESTIONS_DISABLED"
  | "DUPLICATE_OPTION"
  | "TOO_MANY_OPTIONS"
  | "SUGGESTION_NOT_FOUND"
  | "SUGGESTION_ALREADY_DECIDED"
  | "UNDO_UNAVAILABLE";

/**
 * A request the rules refuse. Carries a stable code for callers to map to UI
 * copy; the message is for logs, never shown to guests as-is.
 */
export class PollRuleError extends Error {
  readonly code: PollRuleCode;

  constructor(code: PollRuleCode, message: string) {
    super(message);
    this.name = "PollRuleError";
    this.code = code;
  }
}

export function isPollRuleError(error: unknown, code?: PollRuleCode): error is PollRuleError {
  return error instanceof PollRuleError && (code === undefined || error.code === code);
}

/** Every error code an API response can carry. */
export type ApiErrorCode = PollRuleCode | "UNAUTHENTICATED" | "INTERNAL";

/** The JSON body of every non-2xx API response. */
export type ApiErrorBody = { error: { code: ApiErrorCode; message: string } };
