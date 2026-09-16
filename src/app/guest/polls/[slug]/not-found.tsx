import { SiteHeader } from "@/components/site-header";
import { StatusPage } from "@/components/status/status-page";

/** Inside guest mode, which already shows its banner. */
export default function GuestPollNotFound() {
  return (
    <>
      <SiteHeader account={null} current={null} />
      <main id="main">
        <StatusPage
          bare
          eyebrow="404 · Sample poll not found"
          title="That sample poll doesn’t exist"
          actions={[{ label: "Back to the sample polls", href: "/guest", primary: true }]}
        >
          <p>Guest mode only has Morgan&rsquo;s five sample polls.</p>
        </StatusPage>
      </main>
    </>
  );
}
