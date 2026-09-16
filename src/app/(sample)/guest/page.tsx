import type { Metadata } from "next";
import { GuestDashboard } from "@/components/guest/guest-dashboard";
import { pageMetadata } from "@/lib/seo/site";

// The public front door: the one guest page search engines should list.
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Try Tiebreak as a guest",
    description: "See how Tiebreak settles group decisions: live results, suggestions from the crew and the reveal, over sample polls. No account needed.",
    path: "/guest",
  }),
  robots: { index: true, follow: true },
};

export default function GuestHome() {
  return <GuestDashboard show="all" />;
}
