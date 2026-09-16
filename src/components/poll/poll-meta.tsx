"use client";

import { Avatar } from "@/components/avatar";
import { ClockIcon } from "@/components/icons";
import { formatClosing, shiftSampleTime, timeAgo, useNow } from "@/lib/time";
import type { Vote } from "@/lib/types";

export function StatusPill() {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-teal-soft px-4 text-xs font-extrabold text-teal-deep">
      <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
      Voting open
    </span>
  );
}

export function ClosesChip({ closesAt }: { closesAt: string }) {
  const now = useNow();
  const closing = now === null ? null : formatClosing(shiftSampleTime(closesAt, now), now);

  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border-[1.5px] border-cream-deep bg-card px-4 text-sm text-cocoa-soft">
      <ClockIcon className="text-cocoa" />
      {closing ? (
        <span>
          Closes {closing.day} at <strong className="font-bold text-cocoa tabular-nums">{closing.time}</strong>
        </span>
      ) : (
        // Holds the chip's width until the viewer's local time is known.
        <span className="invisible" aria-hidden="true">
          Closes today at 7:00 PM
        </span>
      )}
    </span>
  );
}

const CREW_FACES = 4;

export function CrewLine({ votes }: { votes: Vote[] }) {
  const now = useNow();

  if (votes.length === 0) {
    return <p className="text-sm text-cocoa-soft">Nobody&rsquo;s voted yet. Share the link to get your crew in.</p>;
  }

  const recent = [...votes].sort((a, b) => b.castAt.localeCompare(a.castAt));
  const voters = new Set(votes.map((vote) => vote.voterToken)).size;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <ul role="list" aria-hidden="true" className="flex">
        {recent.slice(0, CREW_FACES).map((vote, index) => (
          <li key={vote.voterToken} className="-ml-2.5 first:ml-0" style={{ zIndex: CREW_FACES - index }}>
            <Avatar person={vote.voter} size={34} />
          </li>
        ))}
      </ul>
      <p className="text-sm text-cocoa-soft">
        <strong className="font-extrabold text-cocoa tabular-nums">{voters} of your crew</strong> voted
        {now !== null && <> &middot; last one {timeAgo(shiftSampleTime(recent[0].castAt, now), now)}</>}
      </p>
    </div>
  );
}
