import { useSyncExternalStore } from "react";

/**
 * The sample timestamps are written as if "now" is this instant
 * (see data/README.md). Shifting by `now - SAMPLE_NOW` keeps open polls open
 * and relative copy ("2 min ago") matching the concept.
 */
export const SAMPLE_NOW = Date.parse("2026-09-17T15:00:00Z");

// Captured once per page load: relative copy doesn't need to tick.
const loadedAt = typeof window === "undefined" ? 0 : Date.now();
const subscribe = () => () => {};

/**
 * The viewer's "now", or null during server render. Times are formatted in
 * the viewer's own timezone, so they can only be rendered on the client.
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => loadedAt,
    () => null,
  );
}

/** Moves a sample-data timestamp so its distance from "now" matches the dataset. */
export function shiftSampleTime(iso: string, now: number): number {
  return Date.parse(iso) + (now - SAMPLE_NOW);
}

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatClosing(closesAt: number, now: number): { day: string; time: string } {
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(closesAt);
  const days = Math.round((startOfDay(closesAt) - startOfDay(now)) / 86_400_000);
  const day =
    days === 0
      ? "today"
      : days === 1
        ? "tomorrow"
        : new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(closesAt);
  return { day, time };
}

export function timeAgo(then: number, now: number): string {
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
