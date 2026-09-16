"use client";

import { useEffect, useRef, useState } from "react";
import { isMeaningfulChange, raceSummary } from "@/lib/live/announce";
import type { PollResults } from "@/lib/results";

/** At most one race update per this window, however busy the poll gets. */
export const ANNOUNCE_THROTTLE_MS = 10_000;

/**
 * Text for the single polite live region that narrates the race. Stays silent
 * on first load and for changes that don't move the story (a new 0-vote
 * option), and coalesces bursts into the latest summary.
 */
export function useRaceAnnouncement(results: PollResults): string {
  const [message, setMessage] = useState("");
  const announced = useRef(results);
  const lastAt = useRef(0);
  const latest = useRef(results);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = results;
    if (!isMeaningfulChange(announced.current, results) || timer.current) return;

    const wait = Math.max(0, lastAt.current + ANNOUNCE_THROTTLE_MS - Date.now());
    timer.current = setTimeout(() => {
      timer.current = undefined;
      announced.current = latest.current;
      lastAt.current = Date.now();
      setMessage(raceSummary(latest.current));
    }, wait);
  }, [results]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return message;
}
