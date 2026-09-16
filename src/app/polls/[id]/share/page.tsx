import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SharePanel } from "@/components/create/share-panel";
import { SiteHeader } from "@/components/site-header";
import type { CreatorPollView } from "@/domain/views";
import { serverApi } from "@/lib/api/server";
import { creatorAsPerson } from "@/lib/api/session";
import { requireSignedInCreator } from "@/lib/auth/require-creator";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Share your poll" };

/** The share step after creating a poll (and any time the creator wants the link again). */
export default async function SharePage({ params }: PageProps<"/polls/[id]/share">) {
  const { id } = await params;
  const creator = await requireSignedInCreator(`/polls/${id}/share`);
  const result = await serverApi<CreatorPollView>(`/api/creator/polls/${encodeURIComponent(id)}`);
  if (!result.ok) {
    if (result.status === 401) redirect(`/login?next=${encodeURIComponent(`/polls/${id}/share`)}`);
    notFound();
  }
  const poll = result.data;

  return (
    <>
      <SiteHeader account={creatorAsPerson(creator)} current="my-polls" />
      <main id="main" className="mx-auto w-full max-w-form px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        <SharePanel title={poll.title} slug={poll.slug} shareUrl={`${env().NEXT_PUBLIC_APP_URL}/p/${poll.slug}`} />
      </main>
    </>
  );
}
