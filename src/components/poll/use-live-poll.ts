"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePollBackend } from "@/components/poll/poll-backend";
import type { CreatorPollView } from "@/domain/views";

/** Polling every few seconds satisfies "Live: updates as votes land" (spec: under 5s). */
export const POLL_INTERVAL_MS = 4_000;
const MAX_BACKOFF_MS = 30_000;

export type Connection = "live" | "reconnecting";

/**
 * Keeps the creator's view of a poll fresh. Pauses while the tab is hidden,
 * backs off while the server can't be reached, and stops once voting ends.
 */
export function useLivePoll(initial: CreatorPollView) {
  const backend = usePollBackend();
  const [view, setView] = useState(initial);
  const [connection, setConnection] = useState<Connection>("live");
  const failures = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const slug = initial.slug;

  const refresh = useCallback(async (): Promise<boolean> => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const result = await backend.fetchPoll(slug, controller.signal);
      if (result.ok) {
        failures.current = 0;
        setView(result.data);
        setConnection("live");
        return true;
      }
      if (result.status === 401) {
        backend.onUnauthenticated();
        return false;
      }
      if (result.status === 404) {
        // Deleted, or no longer this creator's: let the page render its 404.
        backend.refreshPage();
        return false;
      }
      failures.current += 1;
      setConnection("reconnecting");
      return false;
    } catch {
      // Aborted by a newer refresh; that one reports the outcome.
      return false;
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [backend, slug]);

  const settled = view.status === "settled";

  useEffect(() => {
    if (settled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const schedule = () => {
      clearTimeout(timer);
      if (stopped || document.hidden) return;
      const delay = Math.min(POLL_INTERVAL_MS * 2 ** failures.current, MAX_BACKOFF_MS);
      timer = setTimeout(async () => {
        await refresh();
        schedule();
      }, delay);
    };

    const onVisibility = async () => {
      if (document.hidden) {
        clearTimeout(timer);
        return;
      }
      // Back on the tab: catch up straight away rather than waiting a full interval.
      await refresh();
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      inFlight.current?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, settled]);

  return { view, connection, refresh };
}
