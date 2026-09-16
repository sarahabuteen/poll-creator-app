import { useSyncExternalStore } from "react";

// A shared clock that ticks every 30 seconds while something is listening,
// so "last one 2 min ago" stays true on a page that's left open.
const TICK_MS = 30_000;
let now = typeof window === "undefined" ? 0 : Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => {
    now = Date.now();
    listeners.forEach((notify) => notify());
  }, TICK_MS);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * The viewer's "now", or null during server render. Times are formatted in
 * the viewer's own timezone, so they can only be rendered on the client.
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
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
