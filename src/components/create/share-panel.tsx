"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { useCopy } from "@/components/use-copy";

type SharePanelProps = {
  title: string;
  slug: string;
  shareUrl: string;
};

/**
 * The moment the poll leaves the app and enters the group chat. Everything
 * here points at one action: getting the link into the conversation.
 */
export function SharePanel({ title, slug, shareUrl }: SharePanelProps) {
  const { state: copyState, copy } = useCopy();
  const [canShare, setCanShare] = useState(false);
  const displayUrl = shareUrl.replace(/^https?:\/\//, "");

  // The native share sheet only exists on some devices; offer it once we know.
  useEffect(() => {
    const timer = setTimeout(() => setCanShare(typeof navigator.share === "function"), 0);
    return () => clearTimeout(timer);
  }, []);

  async function share() {
    try {
      await navigator.share({ title, text: title, url: shareUrl });
    } catch {
      // Dismissed, or not allowed: the Copy button is still right there.
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full border-[2.5px] border-cocoa bg-teal text-cream motion-safe:animate-pop"
        >
          <CheckIcon size={34} className="motion-safe:animate-check" />
        </span>
        <div className="motion-safe:animate-rise" style={{ animationDelay: "120ms" }}>
          <h1 className="riso font-display text-[clamp(2rem,1.5rem+2.4vw,2.75rem)] leading-(--leading-display) font-extrabold tracking-[-0.02em]">
            Your poll is ready
          </h1>
          <p className="mt-2 text-md text-cocoa-soft">
            <span className="font-bold text-cocoa">&ldquo;{title}&rdquo;</span> is open. Now get it in front of your crew.
          </p>
        </div>
      </div>

      <section
        aria-labelledby="share-heading"
        className="rounded-lg border-[2.5px] border-cocoa bg-card p-5 motion-safe:animate-rise sm:p-7"
        style={{ animationDelay: "200ms" }}
      >
        <h2 id="share-heading" className="font-display text-lg font-extrabold">
          Drop this link in the group chat
        </h2>
        <p className="mt-1 text-sm text-cocoa-soft">Anyone with it can vote. No accounts, no sign-up.</p>

        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-cream-deep p-3 sm:flex-row sm:items-center sm:rounded-full sm:pl-5">
          {/* Long links truncate; the Copy button is the real way to take it. */}
          <p className="min-w-0 flex-1 truncate font-display text-base font-bold" title={shareUrl}>
            {displayUrl}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copy(shareUrl)}
              className="press inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-cocoa bg-cocoa px-5 font-display text-sm font-bold whitespace-nowrap text-cream shadow-press-cocoa sm:flex-none"
            >
              {copyState === "copied" ? <CheckIcon className="motion-safe:animate-check" /> : <CopyIcon />}
              {copyState === "copied" ? "Copied" : "Copy link"}
            </button>
            {canShare && (
              <button
                type="button"
                onClick={share}
                className="press min-h-12 flex-1 rounded-full border-2 border-cocoa bg-card px-5 font-display text-sm font-bold whitespace-nowrap hover:bg-cream sm:flex-none"
              >
                Share&hellip;
              </button>
            )}
          </div>
        </div>
        {/* Success is visible on the button; a failure needs words on screen too. */}
        <p role="status" className={copyState === "failed" ? "mt-2 text-sm font-bold" : "sr-only"}>
          {copyState === "copied" ? "Link copied" : copyState === "failed" ? "Couldn’t copy the link. Select it above and copy it instead." : ""}
        </p>

        <div className="mt-6">
          <p className="text-sm font-bold">In the chat, it&rsquo;ll read something like:</p>
          <div className="relative mt-3 max-w-sm rounded-lg rounded-bl-sm border-2 border-cocoa bg-teal-soft px-4 py-3 text-sm text-cocoa motion-safe:animate-rise" style={{ animationDelay: "320ms" }}>
            <p className="font-bold">{title}</p>
            <p className="mt-1 break-all text-teal-deep underline underline-offset-2">{shareUrl}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 motion-safe:animate-rise sm:flex-row" style={{ animationDelay: "380ms" }}>
        <Link
          href={`/polls/${encodeURIComponent(slug)}`}
          className="press inline-flex min-h-12 items-center justify-center rounded-full border-2 border-cocoa bg-card px-6 font-display font-bold hover:bg-cream-deep"
        >
          Go to live results
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-full px-6 font-display font-bold text-cocoa-soft hover:bg-cream-deep hover:text-cocoa"
        >
          Back to my polls
        </Link>
      </div>
    </div>
  );
}
