import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PollLiveView } from "@/components/poll/poll-live-view";
import { SiteHeader } from "@/components/site-header";
import type { CreatorPollView, PublicPollView } from "@/domain/views";
import { serverApi } from "@/lib/api/server";
import { env } from "@/lib/env";
import { creator } from "@/lib/sample-data";

// Shared by generateMetadata and the page, so one request calls the API once.
const loadPoll = cache(async (slug: string): Promise<CreatorPollView | PublicPollView | null> => {
  const path = encodeURIComponent(slug);
  const creator = await serverApi<CreatorPollView>(`/api/creator/polls/${path}`);
  if (creator.ok) return creator.data;
  if (creator.status === 404) return null;

  // TODO(scope 2): send signed-out visitors to log in. Until auth exists, creator
  // endpoints are closed in production, so show the read-only public results.
  if (creator.status === 401) {
    const shared = await serverApi<PublicPollView>(`/api/polls/${path}`);
    if (shared.ok) return shared.data;
    if (shared.status === 404) return null;
    throw new Error(`Loading poll failed: ${shared.status} ${shared.error.code}`);
  }
  throw new Error(`Loading poll failed: ${creator.status} ${creator.error.code}`);
});

export async function generateMetadata({ params }: PageProps<"/polls/[id]">): Promise<Metadata> {
  const poll = await loadPoll((await params).id);
  return { title: poll ? `${poll.title} — live results` : "Poll not found" };
}

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const poll = await loadPoll(id);
  // Settled polls (including ones past their closing time) get the reveal screen in scope 6.
  if (!poll || poll.status !== "open") notFound();

  return (
    <>
      <SiteHeader account={creator} current="my-polls" />
      <main id="main" className="mx-auto w-full max-w-content px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        <PollLiveView poll={poll} shareUrl={`${env().NEXT_PUBLIC_APP_URL}/p/${poll.slug}`} />
      </main>
    </>
  );
}
