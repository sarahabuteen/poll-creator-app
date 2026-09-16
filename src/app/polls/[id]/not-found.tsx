import { StatusPage } from "@/components/status/status-page";

/** Creator pages: someone else's poll looks exactly like a missing one, on purpose. */
export default function CreatorPollNotFound() {
  return (
    <StatusPage
      eyebrow="404 · Poll not found"
      title="We couldn’t find that poll"
      actions={[
        { label: "Back to my polls", href: "/", primary: true },
        { label: "New poll", href: "/polls/new" },
      ]}
    >
      <p>It may have been deleted, or it belongs to a different account. Check you&rsquo;re logged in as the organiser who made it.</p>
    </StatusPage>
  );
}
