"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";

type CopyState = "idle" | "copied" | "failed";

export function ShareDock({ shareUrl }: { shareUrl: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 4000);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`https://${shareUrl}`);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-lg bg-cream-deep p-4 sm:flex-row sm:items-center sm:rounded-full sm:py-2 sm:pr-2 sm:pl-6">
        <p className="flex min-w-0 flex-1 flex-col text-sm text-cocoa-soft sm:flex-row sm:items-baseline sm:gap-2">
          <span className="shrink-0">Anyone with the link can vote:</span>
          <span className="truncate font-display text-base font-bold text-cocoa">{shareUrl}</span>
        </p>

        <div className="flex gap-2">
          {/* Not wired yet: settling and the reveal come next. */}
          <button
            type="button"
            className="press whitespace-nowrap min-h-11 flex-1 rounded-full border-2 border-cocoa bg-card px-5 font-display text-sm font-bold text-cocoa hover:bg-cream sm:flex-none"
          >
            End voting
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="press whitespace-nowrap inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border-2 border-cocoa bg-cocoa px-5 font-display text-sm font-bold text-cream shadow-press-cocoa sm:flex-none"
          >
            {copyState === "copied" ? <CheckIcon /> : <CopyIcon />}
            Copy link
          </button>
        </div>
      </div>

      <p role="status" className="sr-only">
        {copyState === "copied" ? "Link copied" : copyState === "failed" ? "Couldn’t copy the link. Select it and copy instead." : ""}
      </p>
      <p className="mt-3 px-6 text-sm text-cocoa-soft">
        Ending early isn&rsquo;t final &mdash; you can reopen voting later if the crew changes its mind.
      </p>
    </div>
  );
}
