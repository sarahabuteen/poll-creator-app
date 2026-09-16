import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";
import { DashboardUnavailable } from "@/components/dashboard/dashboard-unavailable";
import { SiteHeader } from "@/components/site-header";
import { loadDashboard } from "@/lib/api/dashboard";
import { creatorAsPerson } from "@/lib/api/session";
import { requireSignedInCreator } from "@/lib/auth/require-creator";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Closed polls" };

export default async function ClosedPolls() {
  const creator = await requireSignedInCreator("/closed");
  const dashboard = await loadDashboard();

  return (
    <>
      <SiteHeader account={creatorAsPerson(creator)} current="closed" />
      <main id="main" className="mx-auto w-full max-w-content px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
        <h1 className="riso font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em]">
          Closed polls
        </h1>
        <div className="mt-8">
          {dashboard === null ? (
            <DashboardUnavailable retryHref="/closed" />
          ) : (
            <Dashboard polls={dashboard.polls} appUrl={env().NEXT_PUBLIC_APP_URL} show="settled" />
          )}
        </div>
      </main>
    </>
  );
}
