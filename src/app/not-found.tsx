import type { Metadata } from "next";
import { StatusPage } from "@/components/status/status-page";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="404 · Page not found"
      title="Nothing to settle here"
      actions={[
        { label: "My polls", href: "/", primary: true },
        { label: "Try Tiebreak as a guest", href: "/guest" },
      ]}
    >
      <p>This page doesn&rsquo;t exist. The link may be mistyped, or it pointed somewhere that has since moved.</p>
    </StatusPage>
  );
}
