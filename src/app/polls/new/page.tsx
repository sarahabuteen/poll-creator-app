import type { Metadata } from "next";
import { CreatePollForm } from "@/components/create/create-poll-form";
import { SiteHeader } from "@/components/site-header";
import { creatorAsPerson } from "@/lib/api/session";
import { requireSignedInCreator } from "@/lib/auth/require-creator";

export const metadata: Metadata = { title: "New poll" };

export default async function NewPollPage() {
  const creator = await requireSignedInCreator("/polls/new");

  return (
    <>
      <SiteHeader account={creatorAsPerson(creator)} current={null} showNewPoll={false} />
      <main id="main" className="mx-auto w-full max-w-form px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
        <h1 className="riso font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em]">
          New poll
        </h1>
        <p className="mt-2 text-md text-cocoa-soft">Takes under a minute. You&rsquo;ll get a link for the group chat at the end.</p>
        <div className="mt-8">
          <CreatePollForm />
        </div>
      </main>
    </>
  );
}
