import type { Metadata } from "next";
import { GuestDashboard } from "@/components/guest/guest-dashboard";

export const metadata: Metadata = { title: "Closed polls" };

export default function GuestClosed() {
  return <GuestDashboard show="settled" />;
}
