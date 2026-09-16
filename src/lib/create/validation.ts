import { LIMITS } from "@/domain/limits";
import { closingTimeError } from "./closing";

export type CreatePollValues = {
  title: string;
  options: string[];
  voteType: "single" | "multi";
  maxChoices: number;
  suggestionsEnabled: boolean;
  closesAt: Date | null;
};

export type CreatePollErrors = {
  title?: string;
  /** About the list as a whole (too few options). */
  options?: string;
  /** Per option row, by index. */
  optionRows?: Record<number, string>;
  maxChoices?: string;
  closesAt?: string;
};

const normalize = (label: string) => label.trim().replace(/\s+/g, " ").toLocaleLowerCase();

/** Blank rows are simply left off; only the filled-in options count. */
export function filledOptions(options: readonly string[]): string[] {
  return options.map((option) => option.trim()).filter(Boolean);
}

/** Mirrors the server's rules so creators hear about problems before submitting. */
export function validateCreatePoll(values: CreatePollValues, now: Date): CreatePollErrors {
  const errors: CreatePollErrors = {};

  if (!values.title.trim()) errors.title = "Give your poll a title, like the question you're settling.";

  const rows: Record<number, string> = {};
  const seen = new Set<string>();
  values.options.forEach((option, index) => {
    const key = normalize(option);
    if (!key) return;
    if (seen.has(key)) rows[index] = "That option is already on the list.";
    seen.add(key);
  });
  if (Object.keys(rows).length > 0) errors.optionRows = rows;

  const filled = filledOptions(values.options);
  if (filled.length < LIMITS.minOptions) errors.options = "Add at least 2 options to choose between.";

  if (values.voteType === "multi") {
    const most = Math.max(filled.length, LIMITS.minOptions);
    if (values.maxChoices < 2 || values.maxChoices > most) {
      errors.maxChoices = `Let people pick between 2 and ${most}.`;
    }
  }

  const closing = closingTimeError(values.closesAt, now);
  if (closing) errors.closesAt = closing;

  return errors;
}

export function hasErrors(errors: CreatePollErrors): boolean {
  return Boolean(errors.title || errors.options || errors.optionRows || errors.maxChoices || errors.closesAt);
}
