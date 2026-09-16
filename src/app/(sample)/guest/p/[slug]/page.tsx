import type { Metadata } from "next";
import { notFound } from "next/navigation";
import raw from "../../../../../../data/sample-polls.json";
import { GuestVote } from "@/components/guest/guest-vote";
import type { SampleData } from "@/db/sample-types";

export async function generateMetadata({ params }: PageProps<"/guest/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const poll = (raw as SampleData).polls.find((item) => item.id === slug);
  return {
    title: poll ? `${poll.title} — vote` : "Sample poll not found",
    description: poll ? `Vote on “${poll.title}”, a sample poll in Tiebreak’s guest mode. Just a name and a face, no account needed.` : undefined,
  };
}

export default async function GuestVotePage({ params }: PageProps<"/guest/p/[slug]">) {
  const { slug } = await params;
  if (!(raw as SampleData).polls.some((poll) => poll.id === slug)) notFound();
  return <GuestVote slug={slug} />;
}
