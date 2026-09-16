import type { Metadata } from "next";
import { notFound } from "next/navigation";
import raw from "../../../../../../data/sample-polls.json";
import { GuestPoll } from "@/components/guest/guest-poll";
import type { SampleData } from "@/db/sample-types";

export async function generateMetadata({ params }: PageProps<"/guest/polls/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  // Titles only: the sample file is static, and the poll's live state stays in the browser.
  const poll = (raw as SampleData).polls.find((item) => item.id === slug);
  return {
    title: poll?.title ?? "Sample poll not found",
    description: poll ? `“${poll.title}”, a sample poll in Tiebreak’s guest mode. Moderate suggestions, end voting and watch the reveal.` : undefined,
  };
}

export default async function GuestPollPage({ params }: PageProps<"/guest/polls/[slug]">) {
  const { slug } = await params;
  // A real 404 for unknown sample polls, not a friendly page with a 200.
  if (!(raw as SampleData).polls.some((poll) => poll.id === slug)) notFound();
  return <GuestPoll slug={slug} />;
}
