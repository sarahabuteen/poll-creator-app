"use client";

import { Avatar } from "@/components/avatar";
import { CheckIcon, ClockIcon } from "@/components/icons";
import { formatClosing, timeAgo, useNow } from "@/lib/time";
import type { VoterView } from "@/domain/views";

/** Status is always words plus colour, never colour alone. */
export function StatusPill({ status }: { status: "open" | "settled" }) {
  if (status === "settled") {
    return (
      <span className="inline-flex min-h-9 items-center gap-2 rounded-full border-[1.5px] border-cocoa bg-cream-deep px-4 text-xs font-extrabold text-cocoa">
        <CheckIcon size={14} />
        Settled
      </span>
    );
  }
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-teal-soft px-4 text-xs font-extrabold text-teal-deep">
      <span aria-hidden="true" className="size-2 rounded-full bg-teal" />
      Voting open
    </span>
  );
}

/** Whether the numbers on screen are current. */
export function LiveStatus({ status, connection }: { status: "open" | "settled"; connection: "live" | "reconnecting" }) {
  if (status === "settled") {
    return <p className="text-sm text-cocoa-soft">Voting has closed &mdash; these are the final numbers</p>;
  }
  if (connection === "reconnecting") {
    return (
      <p className="flex items-center gap-2 text-sm font-bold text-cocoa">
        <span aria-hidden="true" className="size-2 rounded-full border-2 border-cocoa-faint" />
        Reconnecting&hellip; numbers may be out of date
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-cocoa-soft">
      <span aria-hidden="true" className="relative flex size-4 items-center justify-center rounded-full bg-teal-soft">
        <span className="size-2 rounded-full bg-teal motion-safe:animate-pulse" />
      </span>
      Live &mdash; updates as votes land
    </p>
  );
}

export function ClosesChip({ closesAt }: { closesAt: string }) {
  const now = useNow();
  const closing = now === null ? null : formatClosing(Date.parse(closesAt), now);

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

/** `voters` arrive most recent first and never say who voted for what. */
export function CrewLine({ voters }: { voters: VoterView[] }) {
  const now = useNow();

  if (voters.length === 0) {
    return <p className="text-sm text-cocoa-soft">Nobody&rsquo;s voted yet. Share the link to get your crew in.</p>;
  }


  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <ul role="list" aria-hidden="true" className="flex">
        {voters.slice(0, CREW_FACES).map((voter, index) => (
          <li key={`${voter.castAt}-${index}`} className="-ml-2.5 first:ml-0" style={{ zIndex: CREW_FACES - index }}>
            <Avatar person={voter} size={34} />
          </li>
        ))}
      </ul>
      <p className="text-sm text-cocoa-soft">
        <strong className="font-extrabold text-cocoa tabular-nums">{voters.length} of your crew</strong> voted
        {now !== null && <> &middot; last one {timeAgo(Date.parse(voters[0].castAt), now)}</>}
      </p>
    </div>
  );
}
