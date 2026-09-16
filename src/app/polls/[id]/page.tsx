import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { PollLiveView } from "@/components/poll/poll-live-view";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/db/client";
import { getPollBySlug } from "@/db/queries";
import { env } from "@/lib/env";
import { creator } from "@/lib/sample-data";

// Shared by generateMetadata and the page, so one request queries once.
const loadPoll = cache(async (slug: string) => {
  await connection();
  return getPollBySlug(getDb(), slug);
});

export async function generateMetadata({ params }: PageProps<"/polls/[id]">): Promise<Metadata> {
  const poll = await loadPoll((await params).id);
  return { title: poll ? `${poll.title} — live results` : "Poll not found" };
}

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const poll = await loadPoll(id);
  // Settled polls get their own reveal screen, which isn't built yet (scope 6).
  if (!poll || poll.status !== "open") notFound();

  return (
    <>
      <SiteHeader account={creator} current="my-polls" />
      <main id="main" className="mx-auto w-full max-w-content px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        <PollLiveView poll={poll} shareUrl={`${env().NEXT_PUBLIC_APP_URL}/p/${poll.id}`} />
      </main>
    </>
  );
}
