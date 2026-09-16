"use client";

import { useEffect, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

/** Copies text and reports the outcome for a status message that resets after a few seconds. */
export function useCopy(resetAfterMs = 4000) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), resetAfterMs);
    return () => clearTimeout(timer);
  }, [state, resetAfterMs]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return { state, copy };
}
