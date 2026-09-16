import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";
import { DashboardUnavailable } from "@/components/dashboard/dashboard-unavailable";
import { FirstRun } from "@/components/dashboard/first-run";
import { SiteHeader } from "@/components/site-header";
import { loadDashboard } from "@/lib/api/dashboard";
import { creatorAsPerson } from "@/lib/api/session";
import { requireSignedInCreator } from "@/lib/auth/require-creator";
import { env } from "@/lib/env";

// The root layout's title template doesn't apply to a page in the same segment.
export const metadata: Metadata = { title: { absolute: "My polls · Tiebreak" } };

/** My polls. Signed-out visitors are sent to log in by the proxy. */
export default async function Home() {
  const creator = await requireSignedInCreator("/");
  const dashboard = await loadDashboard();
  const firstRun = dashboard !== null && dashboard.polls.length === 0;

  return (
    <>
      <SiteHeader account={creatorAsPerson(creator)} current="my-polls" showNewPoll={!firstRun} />
      <main id="main" className="mx-auto w-full max-w-content px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        {dashboard === null ? (
          <>
            <h1 className="riso font-display text-2xl font-extrabold tracking-[-0.02em]">My polls</h1>
            <div className="mt-6">
              <DashboardUnavailable retryHref="/" />
            </div>
          </>
        ) : firstRun ? (
          <FirstRun name={creator.name} />
        ) : (
          <>
            <h1 className="riso font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em]">
              My polls
            </h1>
            <div className="mt-8">
              <Dashboard polls={dashboard.polls} appUrl={env().NEXT_PUBLIC_APP_URL} show="all" />
            </div>
          </>
        )}
      </main>
    </>
  );
}
