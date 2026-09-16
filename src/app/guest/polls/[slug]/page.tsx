import { GuestPoll } from "@/components/guest/guest-poll";

export default async function GuestPollPage({ params }: PageProps<"/guest/polls/[slug]">) {
  return <GuestPoll slug={(await params).slug} />;
}
