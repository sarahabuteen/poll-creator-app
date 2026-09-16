import type { Metadata } from "next";
import raw from "../../../../../data/sample-polls.json";
import { GuestPoll } from "@/components/guest/guest-poll";
import type { SampleData } from "@/db/sample-types";

export async function generateMetadata({ params }: PageProps<"/guest/polls/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  // Titles only: the sample file is static, and the poll's live state stays in the browser.
  const poll = (raw as SampleData).polls.find((item) => item.id === slug);
  return { title: poll?.title ?? "Sample poll not found" };
}

export default async function GuestPollPage({ params }: PageProps<"/guest/polls/[slug]">) {
  return <GuestPoll slug={(await params).slug} />;
}
