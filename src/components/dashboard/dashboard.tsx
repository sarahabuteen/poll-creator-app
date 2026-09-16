"use client";

import Link from "next/link";
import { CheckIcon, ClockIcon, CopyIcon } from "@/components/icons";
import { StatusPill } from "@/components/poll/poll-meta";
import { useCopy } from "@/components/use-copy";
import type { CreatorPollSummary } from "@/domain/views";
import { groupPolls, standingLine, suggestionsWaiting } from "@/lib/dashboard";
import { formatClosing, formatSettled, useNow } from "@/lib/time";

type DashboardProps = {
  polls: CreatorPollSummary[];
  /** Base for vote links, e.g. https://tiebreak.app */
  appUrl: string;
  /** "all" on My polls, "settled" on the Closed tab. */
  show: "all" | "settled";
  /** Where poll pages live: "/polls" for creators, "/guest/polls" in guest mode. */
  pollsPath?: string;
};

const shareUrl = (appUrl: string, slug: string) => `${appUrl}/p/${slug}`;


function WhenLine({ poll }: { poll: CreatorPollSummary }) {
  const now = useNow();
  if (now === null) return <span className="invisible">Closes today at 7:00 PM</span>;
  if (poll.status === "open") {
    const { day, time } = formatClosing(Date.parse(poll.closesAt), now);
    return (
      <>
        Closes {day} at <strong className="font-bold text-cocoa tabular-nums">{time}</strong>
      </>
    );
  }
  const when = formatSettled(Date.parse(poll.settledAt ?? poll.closesAt), now);
  return <>{poll.endedEarly ? `Ended early ${when}` : `Closed ${when}`}</>;
}

function WaitingBadge({ count }: { count: number }) {
  const text = suggestionsWaiting(count);
  if (!text) return null;
  // Butter is for pending suggestions in the brand kit; the words carry the meaning.
  return <span className="inline-flex items-center rounded-full border-[1.5px] border-cocoa bg-butter px-3 py-0.5 text-xs font-extrabold">{text}</span>;
}

/** The poll that needs attention first. A zero-vote poll gets a nudge to share instead of an empty race. */
function FeaturedPoll({ poll, appUrl, pollsPath }: { poll: CreatorPollSummary; appUrl: string; pollsPath: string }) {
  const { state, copy } = useCopy();
  const pollHref = (item: CreatorPollSummary) => `${pollsPath}/${item.slug}`;
  const noVotes = poll.totalVotes === 0;

  return (
    <section aria-labelledby="featured-heading" className="rounded-lg border-[2.5px] border-cocoa bg-card p-5 motion-safe:animate-rise sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-cocoa px-3 text-xs font-extrabold tracking-[0.06em] text-cream uppercase">
          <ClockIcon size={12} />
          Closes soonest
        </span>
        <WaitingBadge count={poll.pendingSuggestions} />
      </div>

      <h2 id="featured-heading" className="mt-4 font-display text-xl font-extrabold text-balance">
        <Link href={pollHref(poll)} className="rounded-sm hover:underline hover:underline-offset-4">
          {poll.title}
        </Link>
      </h2>
      <p className="mt-2 text-sm text-cocoa-soft">
        <WhenLine poll={poll} />
      </p>

      {noVotes ? (
        <p className="mt-4 text-md">
          No votes yet. The link works, so drop it in the group chat and the race starts here.
        </p>
      ) : (
        <p className="mt-4 text-md">
          <strong className="font-extrabold tabular-nums">{poll.voterCount} of your crew</strong> voted &middot; {standingLine(poll)}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={pollHref(poll)}
          className="press inline-flex min-h-12 items-center justify-center rounded-full border-2 border-cocoa bg-cocoa px-6 font-display text-sm font-bold text-cream shadow-press-cocoa"
        >
          {noVotes ? "Open the poll" : "See live results"}
        </Link>
        <button
          type="button"
          onClick={() => copy(shareUrl(appUrl, poll.slug))}
          className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-cocoa bg-card px-6 font-display text-sm font-bold hover:bg-cream-deep"
        >
          {state === "copied" ? <CheckIcon className="motion-safe:animate-check" /> : <CopyIcon />}
          {state === "copied" ? "Copied" : "Copy link"}
        </button>
      </div>
      <p role="status" className={state === "failed" ? "mt-2 text-sm font-bold" : "sr-only"}>
        {state === "copied" ? "Link copied" : state === "failed" ? "Couldn’t copy the link. Open the poll to find it." : ""}
      </p>
    </section>
  );
}

function PollList({ id, title, polls, startDelay, pollsPath }: { id: string; title: string; polls: CreatorPollSummary[]; startDelay: number; pollsPath: string }) {
  if (polls.length === 0) return null;
  const pollHref = (item: CreatorPollSummary) => `${pollsPath}/${item.slug}`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-display text-lg font-extrabold">
        {title} <span className="text-cocoa-soft tabular-nums">({polls.length})</span>
      </h2>
      <ul role="list" className="mt-3 flex flex-col gap-3">
        {polls.map((poll, index) => (
          <li key={poll.slug} className="motion-safe:animate-rise" style={{ animationDelay: `${startDelay + index * 60}ms` }}>
            <Link
              href={pollHref(poll)}
              className="group flex flex-col gap-2 rounded-lg border-[2.5px] border-cocoa bg-card p-4 transition-colors hover:bg-cream-deep sm:flex-row sm:items-center sm:gap-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-md font-extrabold group-hover:underline group-hover:underline-offset-4">{poll.title}</p>
                <p className="mt-1 text-sm text-cocoa-soft">
                  <WhenLine poll={poll} /> &middot; {standingLine(poll)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <WaitingBadge count={poll.status === "open" ? poll.pendingSuggestions : 0} />
                <StatusPill status={poll.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The creator's polls, answering "what needs my attention?" before "what exists?". */
export function Dashboard({ polls, appUrl, show, pollsPath = "/polls" }: DashboardProps) {
  const { open, settled } = groupPolls(polls);
  const [featured, ...otherOpen] = open;
  const waiting = open.reduce((sum, poll) => sum + poll.pendingSuggestions, 0);

  if (show === "settled") {
    return settled.length > 0 ? (
      <PollList id="settled-heading" title="Settled" polls={settled} startDelay={0} pollsPath={pollsPath} />
    ) : (
      <p className="rounded-lg border-[2.5px] border-dashed border-cocoa-faint p-6 text-cocoa-soft">
        Nothing&rsquo;s settled yet. Polls land here once voting closes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {waiting > 0 && (
        <p className="text-md motion-safe:animate-rise">
          <strong className="font-extrabold">{suggestionsWaiting(waiting)}</strong> across your open polls.
        </p>
      )}
      {featured ? (
        <FeaturedPoll poll={featured} appUrl={appUrl} pollsPath={pollsPath} />
      ) : (
        <p className="rounded-lg border-[2.5px] border-dashed border-cocoa-faint p-6 text-cocoa-soft">
          No polls open right now. Start one when the group chat needs a decision.
        </p>
      )}
      <PollList id="open-heading" title="Also open" polls={otherOpen} startDelay={120} pollsPath={pollsPath} />
      <PollList id="settled-heading" title="Settled" polls={settled} startDelay={200} pollsPath={pollsPath} />
    </div>
  );
}
