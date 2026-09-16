"use client";

import Link from "next/link";
import { guestShareUrl } from "@/components/guest/guest-dashboard";
import { useGuest } from "@/components/guest/guest-provider";
import { GuestPageSkeleton } from "@/components/guest/guest-skeleton";
import { LogoMark } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { VoteExperience } from "@/components/vote/vote-experience";
import { guestPublicView } from "@/lib/guest/views";

/** A sample poll's vote link: the real vote page, voting into this browser's sample data. */
export function GuestVote({ slug }: { slug: string }) {
  const { data, appUrl, ready, voterToken } = useGuest();
  const poll = data.polls.find((item) => item.id === slug);

  // The vote page keeps its own copy of the poll, so wait for this browser's saved samples and voter token.
  if (!ready) return <GuestPageSkeleton label="Loading the poll…" />;

  return (
    <>
      {/* Like the real vote page: voters don't need the rest of the app. */}
      <header className="mx-auto flex min-h-16 w-full max-w-content flex-wrap items-center gap-2 px-4 font-display text-xl font-extrabold tracking-[-0.02em] sm:px-6">
        <LogoMark size={24} />
        tiebreak
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </header>
      <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
        {poll ? (
          <>
            <VoteExperience poll={guestPublicView(poll, new Date(), voterToken)} shareUrl={guestShareUrl(appUrl, slug)} />
            <p className="mt-10 text-center text-sm text-cocoa-soft">
              Organising this one?{" "}
              <Link href={`/guest/polls/${slug}`} className="font-bold text-cocoa underline underline-offset-2">
                See the live results
              </Link>
            </p>
          </>
        ) : (
          <h1 className="font-display text-xl font-extrabold">That sample poll doesn&rsquo;t exist</h1>
        )}
      </main>
    </>
  );
}
