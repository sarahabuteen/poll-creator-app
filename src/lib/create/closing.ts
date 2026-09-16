import { MAX_VOTING_WINDOW_MS, MIN_VOTING_WINDOW_MS } from "@/domain/limits";

export type ClosingPick = { id: string; label: string; closesAt: Date };

const HOUR = 60 * 60_000;

function at(base: Date, dayOffset: number, hours: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, 0, 0, 0);
  return date;
}

function time(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

/**
 * One-tap closing times, in the creator's own timezone. Most group decisions
 * fit one of these; "Pick a time" covers the rest. "Tonight" only appears
 * while there's still a sensible window before it.
 */
export function quickClosingPicks(now: Date): ClosingPick[] {
  const picks: ClosingPick[] = [{ id: "in-1-hour", label: "In 1 hour", closesAt: new Date(now.getTime() + HOUR) }];

  const tonight = at(now, 0, 21);
  if (tonight.getTime() - now.getTime() >= HOUR) {
    picks.push({ id: "tonight", label: `Tonight at ${time(tonight)}`, closesAt: tonight });
  }
  const tomorrowNoon = at(now, 1, 12);
  picks.push({ id: "tomorrow-noon", label: `Tomorrow at ${time(tomorrowNoon)}`, closesAt: tomorrowNoon });
  picks.push({ id: "in-3-days", label: "In 3 days", closesAt: new Date(now.getTime() + 72 * HOUR) });
  return picks;
}

/** The pick a new poll starts with: tonight if there's time, otherwise tomorrow at noon. */
export function defaultClosingPick(picks: ClosingPick[]): string {
  return picks.some((pick) => pick.id === "tonight") ? "tonight" : "tomorrow-noon";
}

/** `<input type="datetime-local">` speaks local "YYYY-MM-DDTHH:mm". */
export function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function closingTimeError(closesAt: Date | null, now: Date): string | undefined {
  if (!closesAt) return "Pick a date and time for voting to close.";
  const window = closesAt.getTime() - now.getTime();
  if (window < MIN_VOTING_WINDOW_MS) return "Give your crew at least 5 minutes to vote.";
  if (window > MAX_VOTING_WINDOW_MS) return "Polls can stay open for up to 30 days.";
}

/** "Closes Tuesday 16 September at 9:00 PM", in the creator's locale. */
export function describeClosing(closesAt: Date): string {
  const day = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(closesAt);
  return `Closes ${day} at ${time(closesAt)}`;
}
