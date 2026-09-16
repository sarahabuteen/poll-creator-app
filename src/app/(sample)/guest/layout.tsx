import type { Metadata } from "next";
import { FormAlert } from "@/components/forms/form-alert";
import { GuestBanner } from "@/components/guest/guest-banner";
import { GuestProvider } from "@/components/guest/guest-provider";
import type { GuestData } from "@/lib/guest/shift";
import { serverApi } from "@/lib/api/server";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Guest mode", template: "%s · Guest mode · Tiebreak" },
  description: "Try Tiebreak without an account: the real organiser screens over sample polls. Nothing is saved.",
  robots: { index: false, follow: false },
};

/**
 * Guest mode: the real organiser screens over sample data, loaded once per
 * visit from the guest API and kept in this tab. Public, no account needed.
 */
export default async function GuestLayout({ children }: LayoutProps<"/guest">) {
  const result = await serverApi<GuestData & { generatedAt: string }>("/api/guest/polls");

  return (
    <>
      {result.ok ? (
        <GuestProvider initial={{ creator: result.data.creator, polls: result.data.polls }} generatedAt={result.data.generatedAt} appUrl={env().NEXT_PUBLIC_APP_URL}>
          <GuestBanner />
          {children}
        </GuestProvider>
      ) : (
        <>
          <GuestBanner />
          <main id="main" className="mx-auto w-full max-w-content px-4 py-10 sm:px-6">
            <FormAlert>
              The sample polls didn&rsquo;t load.{" "}
              <a href="/guest" className="font-bold underline underline-offset-2">
                Try again
              </a>
              .
            </FormAlert>
          </main>
        </>
      )}
    </>
  );
}
