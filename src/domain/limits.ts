/**
 * Size and time limits shared by the server rules and the browser forms.
 * No dependencies, so client code can import it without pulling in zod.
 */

export const LIMITS = {
  titleLength: 120,
  optionLength: 80,
  nameLength: 40,
  minOptions: 2,
  maxOptions: 10,
  /** Creator options plus approved and pending suggestions. */
  maxBallotOptions: 20,
} as const;

/** Closing times must leave the crew a real chance to vote. */
export const MIN_VOTING_WINDOW_MS = 5 * 60_000;
/** Polls are short-lived group decisions, and settled polls retire after 30 days. */
export const MAX_VOTING_WINDOW_MS = 30 * 24 * 60 * 60_000;
