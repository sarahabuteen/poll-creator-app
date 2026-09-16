"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { ReopenDialog } from "@/components/reveal/reopen-dialog";
import { ResultReveal } from "@/components/reveal/result-reveal";
import { useCopy } from "@/components/use-copy";
import type { CreatorPollView } from "@/domain/views";
import { deriveResults } from "@/lib/results";

/**
 * The organiser's settled poll: the same reveal the crew sees, plus the
 * controls that only the organiser has (the link, and reopening voting).
 */
export function CreatorResult({ poll, shareUrl }: { poll: CreatorPollView; shareUrl: string }) {
  const [reopening, setReopening] = useState<"reopen" | "tie" | null>(null);
  const { state: linkState, copy } = useCopy();
  const tied = deriveResults(poll.options).leaders.length > 1;

  return (
    <>
      <ResultReveal
        audience="creator"
        poll={poll}
        shareUrl={shareUrl}
        tieAction={
          <button
            type="button"
            onClick={() => setReopening("tie")}
            className="press min-h-12 rounded-full border-2 border-cocoa bg-cream-bright px-6 font-display text-sm font-bold text-cocoa shadow-press-cocoa"
          >
            Break the tie: reopen voting
          </button>
        }
        creatorActions={
          <>
            <button
              type="button"
              onClick={() => copy(shareUrl)}
              className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-cocoa bg-card px-6 font-display text-sm font-bold hover:bg-cream-deep"
            >
              {linkState === "copied" ? <CheckIcon className="motion-safe:animate-check" /> : <CopyIcon />}
              {linkState === "copied" ? "Link copied" : "Copy link"}
            </button>
            {!tied && (
              <button
                type="button"
                onClick={() => setReopening("reopen")}
                className="min-h-12 rounded-full px-5 font-display text-sm font-bold text-cocoa-soft hover:bg-cream-deep hover:text-cocoa"
              >
                Reopen voting
              </button>
            )}
            <span role="status" className="sr-only">
              {linkState === "copied" ? "Link copied" : ""}
            </span>
          </>
        }
      />
      <ReopenDialog open={reopening !== null} slug={poll.slug} breakingTie={reopening === "tie"} onClose={() => setReopening(null)} />
    </>
  );
}
