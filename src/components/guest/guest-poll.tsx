"use client";

import Link from "next/link";
import { guestShareUrl } from "@/components/guest/guest-dashboard";
import { useGuest } from "@/components/guest/guest-provider";
import { PollLiveView } from "@/components/poll/poll-live-view";
import { CreatorResult } from "@/components/reveal/creator-result";
import { SiteHeader } from "@/components/site-header";
import { guestCreatorView } from "@/lib/guest/views";
import { useNow } from "@/lib/time";

/** A sample poll on the organiser's real screens: live results, moderation, ending, the reveal. */
export function GuestPoll({ slug }: { slug: string }) {
  const { data, generatedAt, appUrl, revealKeyFor } = useGuest();
  const now = new Date(useNow() ?? generatedAt);
  const poll = data.polls.find((item) => item.id === slug);

  if (!poll) {
    return (
      <>
        <SiteHeader account={null} current={null} />
        <main id="main" className="mx-auto w-full max-w-content px-4 py-10 sm:px-6">
          <h1 className="font-display text-xl font-extrabold">That sample poll doesn&rsquo;t exist</h1>
          <p className="mt-3">
            <Link href="/guest" className="font-bold underline underline-offset-2">
              Back to the sample polls
            </Link>
          </p>
        </main>
      </>
    );
  }

  const view = guestCreatorView(poll, now);
  const shareUrl = guestShareUrl(appUrl, view.slug);

  return (
    <>
      <SiteHeader account={null} current="my-polls" />
      <main id="main" className="mx-auto w-full max-w-content px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        {view.status === "settled" ? (
          <>
            <h1 className="riso mb-6 font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em] text-pretty">
              {view.title}
            </h1>
            <CreatorResult key={view.settledAt} poll={view} shareUrl={shareUrl} revealKey={revealKeyFor(view.slug)} />
          </>
        ) : (
          // Keyed by closing time so reopening remounts the live screen with fresh state.
          <PollLiveView key={view.closesAt} poll={view} shareUrl={shareUrl} />
        )}
      </main>
    </>
  );
}
