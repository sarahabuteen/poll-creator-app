"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicPollView } from "@/domain/views";
import { fetchPublicPoll } from "@/lib/api/client";

/** Voters don't watch a race, so a gentle refresh is plenty (and cheap: 304s). */
const REFRESH_MS = 15_000;

/**
 * Keeps a voter's copy of the poll current: newly approved options, the crew
 * count, and the moment voting closes (it refreshes right at the deadline).
 */
export function usePublicPoll(initial: PublicPollView) {
  const [view, setView] = useState(initial);
  const inFlight = useRef<AbortController | null>(null);
  const slug = initial.slug;

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    try {
      const result = await fetchPublicPoll(slug, controller.signal);
      if (result.ok) setView(result.data);
      return result.ok ? result.data : null;
    } catch {
      return null;
    }
  }, [slug]);

  const settled = view.status === "settled";
  const closesAt = view.closesAt;

  useEffect(() => {
    if (settled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      // Wake up at the deadline if it comes before the next regular refresh.
      const untilClose = Date.parse(closesAt) - Date.now() + 1_000;
      timer = setTimeout(async () => {
        await refresh();
        schedule();
      }, Math.max(1_000, Math.min(REFRESH_MS, untilClose)));
    };
    const onVisibility = async () => {
      if (document.hidden) return clearTimeout(timer);
      await refresh();
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      inFlight.current?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, settled, closesAt]);

  return { view, refresh };
}
