import { StatusPage } from "@/components/status/status-page";

/** A vote link that leads nowhere. Most people here are voters, so no account talk. */
export default function PollNotFound() {
  return (
    <StatusPage eyebrow="404 · Poll not found" title="This poll isn’t here" actions={[{ label: "See how Tiebreak works", href: "/guest" }]}>
      <p>The link might be missing a character, or the organiser may have deleted the poll.</p>
      <p>Ask whoever shared it in the group chat for a fresh link.</p>
    </StatusPage>
  );
}
