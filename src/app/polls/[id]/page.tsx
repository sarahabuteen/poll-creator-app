import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PollLiveView } from "@/components/poll/poll-live-view";
import { SiteHeader } from "@/components/site-header";
import { creator, getPoll, getPolls } from "@/lib/sample-data";

// Frontend-only for now: every page is prerendered from the sample data.
export const dynamicParams = false;

export function generateStaticParams() {
  // Settled polls get their own reveal screen, which isn't built yet.
  return getPolls()
    .filter((poll) => poll.status === "open")
    .map((poll) => ({ id: poll.id }));
}

export async function generateMetadata({ params }: PageProps<"/polls/[id]">): Promise<Metadata> {
  const poll = getPoll((await params).id);
  return { title: poll ? `${poll.title} — live results` : "Poll not found" };
}

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const poll = getPoll((await params).id);
  if (!poll || poll.status !== "open") notFound();

  return (
    <>
      <SiteHeader account={creator} current="my-polls" />
      <main id="main" className="mx-auto w-full max-w-content px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        <PollLiveView poll={poll} />
      </main>
    </>
  );
}
