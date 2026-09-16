"use client";

import { Avatar } from "@/components/avatar";
import { CheckIcon } from "@/components/icons";
import type { Person, PublicPollView } from "@/domain/views";
import { deriveResults, pluralVotes } from "@/lib/results";
import { formatSettled, useNow } from "@/lib/time";
import { backersLine, describeOutcome, listNames } from "@/lib/vote/copy";

const FACES_SHOWN = 5;

function BackerFaces({ backers, delay }: { backers: Person[]; delay: number }) {
  if (backers.length === 0) return null;
  return (
    <ul role="list" aria-hidden="true" className="flex">
      {backers.slice(0, FACES_SHOWN).map((person, index) => (
        <li
          key={`${person.name}-${index}`}
          className="-ml-2 first:ml-0 motion-safe:animate-pop"
          style={{ zIndex: FACES_SHOWN - index, animationDelay: `${delay + index * 70}ms` }}
        >
          <Avatar person={person} size={28} />
        </li>
      ))}
    </ul>
  );
}

/**
 * A settled poll, for voters and latecomers: the result in words, the
 * standings with counts beside every percentage, and who backed what.
 * The full reveal moment is designed in scope 6; this is the plain version.
 */
export function PollResult({ poll }: { poll: PublicPollView }) {
  const now = useNow();
  const results = deriveResults(poll.options);
  const outcome = describeOutcome(results);
  const ranked = [...results.leaders, ...results.pack];
  const topVotes = results.leaders[0]?.votes ?? 0;
  const mine = new Set(poll.viewerBallot?.optionIds ?? []);
  const backersOf = (id: string) => poll.options.find((option) => option.id === id)?.backers ?? [];
  const settledAt = poll.settledAt ? Date.parse(poll.settledAt) : null;
  const when = now !== null && settledAt !== null ? formatSettled(settledAt, now) : null;

  return (
    <section aria-labelledby="result-heading" className="flex flex-col gap-6">
      <p className="text-sm text-cocoa-soft">
        {poll.endedEarly ? "The organiser ended voting" : "Voting closed"}
        {when ? ` ${when}` : ""}
        {poll.viewerBallot && (
          <>
            {" "}&middot; You backed{" "}
            <strong className="font-bold text-cocoa">
              {listNames(poll.options.filter((option) => mine.has(option.id)).map((option) => option.label))}
            </strong>
          </>
        )}
      </p>

      <div
        className={`rounded-lg border-[2.5px] border-cocoa p-6 motion-safe:animate-rise sm:p-8 ${
          outcome.kind === "empty" ? "bg-card text-cocoa" : "bg-tangerine text-cream-bright"
        }`}
      >
        <h2 id="result-heading" className="font-display text-xl font-extrabold text-balance">
          {outcome.headline}
        </h2>
        <p
          className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
            outcome.kind === "empty" ? "bg-cream-deep" : "bg-scrim-on-tangerine"
          }`}
        >
          {outcome.detail}
        </p>
        {outcome.kind === "winner" && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <BackerFaces backers={backersOf(results.leaders[0].option.id)} delay={250} />
            <p className="text-sm font-bold">{backersLine(backersOf(results.leaders[0].option.id))}</p>
          </div>
        )}
      </div>

      {ranked.length > 0 && (
        <ol role="list" className="rounded-lg border-[2.5px] border-cocoa bg-card px-5 sm:px-7">
          {ranked.map(({ option, votes, percent }, index) => {
            const backers = backersOf(option.id);
            return (
              <li key={option.id} className="border-b-2 border-dashed border-cream-deep py-5 last:border-b-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-md font-extrabold">
                    {option.label}
                    {mine.has(option.id) && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 align-middle text-xs font-extrabold text-teal-deep">
                        <CheckIcon size={12} />
                        Your pick
                      </span>
                    )}
                  </p>
                  <p className="flex items-baseline gap-2 tabular-nums">
                    <span className="font-display text-lg font-extrabold">{percent}%</span>
                    <span className="text-sm text-cocoa-soft">{pluralVotes(votes)}</span>
                  </p>
                </div>

                <div aria-hidden="true" className="mt-3 h-3 overflow-hidden rounded-full bg-cream-deep">
                  <div
                    // Teal for every bar: the outcome card above is the screen's one tangerine moment.
                    className="h-full origin-left rounded-full bg-teal motion-safe:animate-grow-x"
                    style={{ width: `${topVotes === 0 ? 0 : (votes / topVotes) * 100}%`, animationDelay: `${200 + index * 90}ms` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-cocoa-soft">
                  <BackerFaces backers={backers} delay={400 + index * 90} />
                  <span>{backersLine(backers)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
