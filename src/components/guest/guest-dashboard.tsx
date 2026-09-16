"use client";

import { Dashboard } from "@/components/dashboard/dashboard";
import { useGuest } from "@/components/guest/guest-provider";
import { SiteHeader } from "@/components/site-header";
import { guestSummary } from "@/lib/guest/views";
import { useNow } from "@/lib/time";

/**
 * The guest vote page. Sample polls live in this browser, so the link works in
 * any tab here (vote in one, watch the results move in another); on another
 * device it opens the untouched samples.
 */
export const guestShareUrl = (appUrl: string, slug: string) => `${appUrl}/guest/p/${slug}`;

export function GuestDashboard({ show }: { show: "all" | "settled" }) {
  const { data, generatedAt, appUrl } = useGuest();
  // Until the client clock is known, summarise at the moment the data was generated so server and client agree.
  const now = new Date(useNow() ?? generatedAt);
  const polls = data.polls.map((poll) => guestSummary(poll, now));

  return (
    <>
      <SiteHeader account={null} current={show === "all" ? "my-polls" : "closed"} />
      <main id="main" className="mx-auto w-full max-w-content px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        <p className="font-display text-md font-bold text-cocoa-soft">You&rsquo;re looking at {data.creator.name}&rsquo;s polls</p>
        <h1 className="riso mt-1 font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em]">
          {show === "all" ? "My polls" : "Closed polls"}
        </h1>
        <div className="mt-8">
          <Dashboard polls={polls} appUrl={appUrl} show={show} pollsPath="/guest/polls" sharePath="/guest/p" />
        </div>
      </main>
    </>
  );
}
