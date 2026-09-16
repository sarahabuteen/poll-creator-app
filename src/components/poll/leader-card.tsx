"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { pluralVotes, TALLY_MAX_VOTES, type PollResults } from "@/lib/results";

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export const LEADER_CARD_ID = "leader-card";

/** The one tangerine moment on the live screen: whoever is ahead, told honestly. */
export function LeaderCard({ results }: { results: PollResults }) {
  const { leaders, totalVotes, margin } = results;
  const lead = leaders[0];
  const tied = leaders.length > 1;
  const suggestedBy = !tied ? lead.option.suggestedBy : undefined;
  // One vote isn't a race yet: "leading" would be a claim, not a fact.
  const ribbon = tied ? "Tied" : totalVotes === 1 ? "First vote" : "In the lead";

  return (
    // Focusable only by script: where focus goes when a focused pack row takes the lead.
    <div
      id={LEADER_CARD_ID}
      tabIndex={-1}
      className="relative overflow-hidden rounded-lg border-[2.5px] border-cocoa bg-tangerine p-5 text-cream-bright sm:p-7"
    >
      <p
        aria-hidden="true"
        className="absolute top-5 -right-15 w-52 rotate-[38deg] border-y-2 border-cocoa bg-butter py-1 text-center font-display text-xs font-extrabold tracking-[0.06em] text-cocoa uppercase sm:top-7 sm:-right-16 sm:w-60 sm:py-1.5 sm:text-sm"
      >
        {ribbon}
      </p>

      <p className="sr-only">{tied ? "Tied for the lead:" : totalVotes === 1 ? "First vote in:" : "In the lead:"}</p>
      <p className="pr-24 font-display text-xl font-extrabold text-balance sm:pr-36">
        {listNames(leaders.map((leader) => leader.option.label))}
      </p>

      {suggestedBy && (
        <p className="mt-3 inline-flex min-h-8 items-center gap-2 rounded-full bg-scrim-on-tangerine py-1 pr-4 pl-1 text-sm font-bold">
          <Avatar person={suggestedBy} size={24} />
          Suggested by {suggestedBy.name}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <p className="flex items-start font-display font-black tabular-nums">
          <span className="text-num">{lead.percent}</span>
          <span className="mt-1 text-lg font-extrabold">%</span>
        </p>
        <p className="mb-2 rounded-full bg-scrim-on-tangerine px-4 py-2 text-sm tabular-nums">
          {tied ? (
            <>
              <strong className="font-extrabold">Tied at {pluralVotes(lead.votes)} each</strong> &middot; {totalVotes} total
            </>
          ) : (
            <>
              <strong className="font-extrabold">
                {lead.votes} of {pluralVotes(totalVotes)}
              </strong>
              {margin > 0 && <> &middot; ahead by {margin}</>}
            </>
          )}
        </p>
      </div>

      <Tally votes={lead.votes} total={totalVotes} />
    </div>
  );
}

/** One tick per vote, filled for the leader's. Numbers live in text, so this is decorative. */
function Tally({ votes, total }: { votes: number; total: number }) {
  // Remember the previous count so only newly landed votes stamp in.
  const [seen, setSeen] = useState(votes);
  const [stampFrom, setStampFrom] = useState(votes);
  if (votes !== seen) {
    setStampFrom(Math.min(seen, votes));
    setSeen(votes);
  }

  if (total > TALLY_MAX_VOTES) {
    return (
      <div aria-hidden="true" className="mt-4 h-4 overflow-hidden rounded-full bg-tangerine-deep">
        <div
          className="h-full rounded-full bg-butter transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${(votes / total) * 100}%` }}
        />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="mt-4 flex gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-4 flex-1 rounded-sm ${index < votes ? "bg-butter" : "bg-tangerine-deep"} ${
            index >= stampFrom && index < votes ? "motion-safe:animate-stamp" : ""
          }`}
        />
      ))}
    </div>
  );
}
