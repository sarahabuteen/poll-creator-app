import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LogoMark } from "@/components/icons";
import { VoteExperience } from "@/components/vote/vote-experience";
import type { PublicPollView } from "@/domain/views";
import { serverApi } from "@/lib/api/server";
import { env } from "@/lib/env";

// Shared by generateMetadata and the page, so one request calls the API once.
// The voter's cookie is forwarded, so a returning voter gets their own ballot back.
const loadPoll = cache(async (slug: string) => {
  const result = await serverApi<PublicPollView>(`/api/polls/${encodeURIComponent(slug)}`);
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  throw new Error(`Loading poll failed: ${result.status} ${result.error.code}`);
});

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const poll = await loadPoll((await params).slug);
  if (!poll) return { title: "Poll not found" };
  const suffix = poll.status === "settled" ? "result" : poll.viewerBallot ? "you’re in" : "vote";
  return { title: `${poll.title} — ${suffix}`, robots: { index: false, follow: false } };
}

/** The public vote page: no account, no login wall, one link from the group chat. */
export default async function VotePage({ params }: PageProps<"/p/[slug]">) {
  const poll = await loadPoll((await params).slug);
  if (!poll) notFound();

  return (
    <>
      {/* Voters never need the rest of the app, so the logo isn't a way out. */}
      <header className="mx-auto flex min-h-16 w-full max-w-content items-center gap-2 px-4 font-display text-xl font-extrabold tracking-[-0.02em] sm:px-6">
        <LogoMark size={24} />
        tiebreak
      </header>
      <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
        <VoteExperience poll={poll} shareUrl={`${env().NEXT_PUBLIC_APP_URL}/p/${poll.slug}`} />
      </main>
    </>
  );
}
