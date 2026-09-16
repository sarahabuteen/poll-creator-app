"use client";

import { useEffect, useState } from "react";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Whether the reveal should play: only the first time this browser sees this
 * poll's result (reopening and settling again counts as a new result), and
 * never for viewers who prefer reduced motion.
 *
 * "pending" until the browser has checked, so the result doesn't flash in its
 * final state and then animate.
 */
export function useFirstReveal(revealKey: string): "pending" | "play" | "still" {
  const [phase, setPhase] = useState<"pending" | "play" | "still">("pending");

  useEffect(() => {
    const key = `tiebreak:revealed:${revealKey}`;
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
    } catch {
      // No storage (private mode): play it, better than never.
    }
    const show = setTimeout(() => setPhase(!seen && !reducedMotion() ? "play" : "still"), 0);
    // Marked as seen once it has been on screen long enough to play. An effect
    // React cancels (dev double-mount, a quick navigation away) never marks it,
    // and neither does a tab opened in the background: browsers pause
    // animations there, so the countdown only runs while the page is visible.
    let remember: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(remember);
      if (document.hidden) return;
      remember = setTimeout(() => {
        try {
          localStorage.setItem(key, "1");
        } catch {
          // Nothing to do: it'll play again next time.
        }
        document.removeEventListener("visibilitychange", arm);
      }, 1200);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      clearTimeout(show);
      clearTimeout(remember);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [revealKey]);

  return phase;
}

/** Counts from 0 to `target` once, easing out. Jumps straight to the target when not playing. */
export function useCountUp(target: number, play: boolean, durationMs = 900, delayMs = 250): number {
  const [value, setValue] = useState(play ? 0 : target);

  useEffect(() => {
    if (!play) {
      const timer = setTimeout(() => setValue(target), 0);
      return () => clearTimeout(timer);
    }
    let frame = 0;
    let start: number | null = null;
    const step = (time: number) => {
      start ??= time + delayMs;
      const progress = Math.min(1, Math.max(0, (time - start) / durationMs));
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, play, durationMs, delayMs]);

  return value;
}
