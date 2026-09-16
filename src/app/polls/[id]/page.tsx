import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { PollLiveView } from "@/components/poll/poll-live-view";
import { SiteHeader } from "@/components/site-header";
import type { CreatorPollView } from "@/domain/views";
import { serverApi } from "@/lib/api/server";
import { creatorAsPerson } from "@/lib/api/session";
import { requireSignedInCreator } from "@/lib/auth/require-creator";
import { env } from "@/lib/env";

// Shared by generateMetadata and the page, so one request calls the API once.
const loadPoll = cache(async (slug: string) => {
  const result = await serverApi<CreatorPollView>(`/api/creator/polls/${encodeURIComponent(slug)}`);
  if (result.ok) return result.data;
  // Someone else's poll looks exactly like a missing one.
  if (result.status === 404) return null;
  if (result.status === 401) redirect(`/login?next=${encodeURIComponent(`/polls/${slug}`)}`);
  throw new Error(`Loading poll failed: ${result.status} ${result.error.code}`);
});

export async function generateMetadata({ params }: PageProps<"/polls/[id]">): Promise<Metadata> {
  const poll = await loadPoll((await params).id);
  return { title: poll ? `${poll.title} — live results` : "Poll not found" };
}

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const creator = await requireSignedInCreator(`/polls/${id}`);
  const poll = await loadPoll(id);
  // Settled polls (including ones past their closing time) get the reveal screen in scope 6.
  if (!poll || poll.status !== "open") notFound();

  return (
    <>
      <SiteHeader account={creatorAsPerson(creator)} current="my-polls" />
      <main id="main" className="mx-auto w-full max-w-content px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        <PollLiveView poll={poll} shareUrl={`${env().NEXT_PUBLIC_APP_URL}/p/${poll.slug}`} />
      </main>
    </>
  );
}
