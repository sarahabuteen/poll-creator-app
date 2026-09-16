"use client";

import { Avatar } from "@/components/avatar";
import { CheckIcon, ClockIcon } from "@/components/icons";
import type { PublicPollView } from "@/domain/views";
import { formatClosing, useNow } from "@/lib/time";
import { listNames } from "@/lib/vote/copy";
import { identityAsPerson, type Identity } from "@/lib/vote/presets";

type VotedStateProps = {
  poll: PublicPollView;
  optionIds: readonly string[];
  /** Known when this browser cast the vote (just now, or remembered locally). */
  identity: Identity | null;
  /** True right after casting: the small delight moment plays. */
  justVoted: boolean;
};

const CREW_FACES = 6;

/**
 * After the vote lands, and on every visit until voting closes. Calm on
 * purpose: the voter's own choice, who else is in, and when the result lands.
 * No live race, so later voters aren't swayed and the reveal stays a moment.
 */
export function VotedState({ poll, optionIds, identity, justVoted }: VotedStateProps) {
  const now = useNow();
  const backed = poll.options.filter((option) => optionIds.includes(option.id)).map((option) => option.label);
  const closing = now === null ? null : formatClosing(Date.parse(poll.closesAt), now);
  const firstName = identity?.name.trim();
  // The celebration only plays for a fresh vote; returning visitors get the same screen, still.
  const motion = (className: string) => (justVoted ? className : "");

  return (
    <section aria-labelledby="voted-heading" className="rounded-lg border-[2.5px] border-cocoa bg-card p-6 text-center sm:p-10">
      <div className="relative mx-auto w-fit">
        {identity ? (
          <span className={`block ${motion("motion-safe:animate-pop")}`}>
            <Avatar person={identityAsPerson(identity)} size={96} />
          </span>
        ) : (
          <span aria-hidden="true" className="flex size-24 items-center justify-center rounded-full border-[2.5px] border-cocoa bg-teal-soft">
            <CheckIcon size={44} className="text-teal-deep" />
          </span>
        )}
        {identity && (
          <span
            aria-hidden="true"
            className={`absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full border-[2.5px] border-cocoa bg-teal text-cream ${motion("motion-safe:animate-check")}`}
            style={justVoted ? { animationDelay: "280ms" } : undefined}
          >
            <CheckIcon size={20} />
          </span>
        )}
      </div>

      <h2
        id="voted-heading"
        tabIndex={-1}
        className={`mt-5 font-display text-xl font-extrabold ${motion("motion-safe:animate-rise")}`}
        style={justVoted ? { animationDelay: "160ms" } : undefined}
      >
        {justVoted ? (firstName ? `Counted, ${firstName}!` : "Counted!") : firstName ? `You’re in, ${firstName}` : "You’ve already voted"}
      </h2>
      <p className={`mt-2 text-md text-cocoa ${motion("motion-safe:animate-rise")}`} style={justVoted ? { animationDelay: "240ms" } : undefined}>
        You backed <strong className="font-extrabold">{listNames(backed)}</strong>
      </p>
      <p className="mt-1 text-sm text-cocoa-soft">No takebacks: your vote is locked in.</p>

      <div className="mt-8 flex flex-col items-center gap-2">
        <ul role="list" aria-hidden="true" className="flex">
          {poll.voters.slice(0, CREW_FACES).map((voter, index) => (
            <li
              key={`${voter.castAt}-${index}`}
              className={`-ml-2.5 first:ml-0 ${motion("motion-safe:animate-pop")}`}
              style={{ zIndex: CREW_FACES - index, ...(justVoted ? { animationDelay: `${420 + index * 60}ms` } : {}) }}
            >
              <Avatar person={voter} size={34} />
            </li>
          ))}
        </ul>
        <p className="text-sm text-cocoa-soft tabular-nums">
          {poll.voters.length === 1 ? "You’re the first to vote" : `${poll.voters.length} of the crew have voted`}
        </p>
      </div>

      <p className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full bg-cream-deep px-4 py-2 text-sm text-cocoa">
        <ClockIcon />
        {closing ? (
          <span>
            The result lands here when voting closes {closing.day} at <strong className="font-bold tabular-nums">{closing.time}</strong>
          </span>
        ) : (
          <span>The result lands here when voting closes</span>
        )}
      </p>
    </section>
  );
}
