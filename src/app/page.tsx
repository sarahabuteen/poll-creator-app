import { SiteHeader } from "@/components/site-header";
import { creatorAsPerson } from "@/lib/api/session";
import { requireSignedInCreator } from "@/lib/auth/require-creator";

/**
 * Interim home for signed-in creators until the dashboard lands (scope 5).
 * Signed-out visitors are sent to log in by the proxy.
 */
export default async function Home() {
  const creator = await requireSignedInCreator("/");

  return (
    <>
      <SiteHeader account={creatorAsPerson(creator)} current="my-polls" />
      <main id="main" className="mx-auto w-full max-w-content px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        <h1 className="riso font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em] text-cocoa">
          Hi, {creator.name}
        </h1>
        <p className="mt-4 text-md text-cocoa-soft">You&rsquo;re signed in. Your polls will show up here.</p>
      </main>
    </>
  );
}
