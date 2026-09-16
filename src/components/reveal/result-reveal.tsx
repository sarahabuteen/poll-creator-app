"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { Confetti } from "@/components/reveal/confetti";
import { useCountUp, useFirstReveal } from "@/components/reveal/use-reveal";
import { useCopy } from "@/components/use-copy";
import type { Person, PollView } from "@/domain/views";
import { deriveResults, pluralVotes, TALLY_MAX_VOTES } from "@/lib/results";
import { buildResultText } from "@/lib/reveal/result-text";
import { formatSettled, useNow } from "@/lib/time";
import { describeOutcome, listNames, peopleList } from "@/lib/vote/copy";

type ResultRevealProps = {
  poll: PollView;
  shareUrl: string;
  /** The viewer's own picks, when they voted. */
  viewerOptionIds?: readonly string[];
  /** Creator-only actions (reopen, copy link) rendered beside Copy result. */
  creatorActions?: ReactNode;
  /** Shown inside a tie card: how the tie can be broken, for this audience. */
  tieAction?: ReactNode;
  /** Who's looking: the organiser reads "You ended voting", the crew "The organiser ended voting". */
  audience: "creator" | "public";
  /** What counts as "the same result" for playing the reveal once. Defaults to this poll's settle time. */
  revealKey?: string;
};

const FACES = 6;

function Faces({ people, size, playing, delay }: { people: Person[]; size: number; playing: boolean; delay: number }) {
  if (people.length === 0) return null;
  return (
    <ul role="list" aria-hidden="true" className="flex">
      {people.slice(0, FACES).map((person, index) => (
        <li
          key={`${person.name}-${index}`}
          className={`-ml-2 first:ml-0 ${playing ? "animate-pop" : ""}`}
          style={{ zIndex: FACES - index, ...(playing ? { animationDelay: `${delay + index * 90}ms` } : {}) }}
        >
          <Avatar person={person} size={size} />
        </li>
      ))}
    </ul>
  );
}

/** One tick per vote; during the reveal they stamp in one after another. */
function Tally({ votes, total, playing }: { votes: number; total: number; playing: boolean }) {
  if (total === 0) return null;
  if (total > TALLY_MAX_VOTES) {
    return (
      <div aria-hidden="true" className="mt-5 h-4 overflow-hidden rounded-full bg-tangerine-deep">
        <div className={`h-full origin-left rounded-full bg-butter ${playing ? "animate-grow-x" : ""}`} style={{ width: `${(votes / total) * 100}%`, animationDelay: "400ms" }} />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="mt-5 flex gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-4 flex-1 rounded-sm ${index < votes ? "bg-butter" : "bg-tangerine-deep"} ${playing && index < votes ? "animate-stamp" : ""}`}
          style={playing && index < votes ? { animationDelay: `${450 + index * 110}ms` } : undefined}
        />
      ))}
    </div>
  );
}

/**
 * The settled poll, for the organiser and the crew. The first time a browser
 * sees it, the result is revealed: the card drops in, the number counts up,
 * ticks stamp, the ribbon swings in and confetti falls. Every later visit (and
 * every reduced-motion visit) shows the same screen at rest, still built to be
 * understood from a screenshot alone.
 */
export function ResultReveal({ poll, shareUrl, viewerOptionIds = [], creatorActions, tieAction, audience, revealKey }: ResultRevealProps) {
  const phase = useFirstReveal(revealKey ?? `${poll.slug}:${poll.settledAt ?? "unknown"}`);
  const playing = phase === "play";
  const now = useNow();
  const { state: copyState, copy } = useCopy();
  const [announced, setAnnounced] = useState("");

  const results = deriveResults(poll.options);
  const outcome = describeOutcome(results);
  const lead = results.leaders[0];
  const percent = useCountUp(lead?.percent ?? 0, playing && outcome.kind === "winner");
  const backersOf = (id: string) => poll.options.find((option) => option.id === id)?.backers ?? [];
  const mine = new Set(viewerOptionIds);
  const ranked = [...results.leaders, ...results.pack];
  const topVotes = lead?.votes ?? 0;
  const settledAt = poll.settledAt ? Date.parse(poll.settledAt) : null;
  const when = now !== null && settledAt !== null ? formatSettled(settledAt, now) : null;

  // The reveal is announced once, in words, whether or not anything moves.
  useEffect(() => {
    if (phase === "pending") return;
    const timer = setTimeout(() => setAnnounced(`Voting has closed. ${outcome.headline}. ${outcome.detail}.`), 300);
    return () => clearTimeout(timer);
  }, [phase, outcome.headline, outcome.detail]);

  const resultText = buildResultText({ title: poll.title, options: poll.options, shareUrl });

  return (
    // Hidden only for the instant it takes to decide whether to play, so it never flashes then animates.
    <section aria-labelledby="result-heading" className={`flex flex-col gap-6 ${phase === "pending" ? "opacity-0" : ""}`}>
      <p className="text-sm text-cocoa-soft">
        {poll.endedEarly ? (audience === "creator" ? "You ended voting" : "The organiser ended voting") : "Voting closed"}
        {when ? ` ${when}` : ""}
        {mine.size > 0 && (
          <>
            {" "}&middot; You backed{" "}
            <strong className="font-bold text-cocoa">
              {listNames(poll.options.filter((option) => mine.has(option.id)).map((option) => option.label))}
            </strong>
          </>
        )}
      </p>

      <div className="relative">
        {playing && outcome.kind === "winner" && <Confetti />}

        {outcome.kind === "winner" && (
          <div className={`relative overflow-hidden rounded-lg border-[2.5px] border-cocoa bg-tangerine p-6 text-cream-bright sm:p-8 ${playing ? "animate-drop-in" : ""}`}>
            <p
              aria-hidden="true"
              className={`absolute top-6 -right-15 w-52 rotate-[38deg] border-y-2 border-ink bg-butter py-1 text-center font-display text-xs font-extrabold tracking-[0.06em] text-ink uppercase sm:top-8 sm:-right-14 sm:w-60 sm:py-1.5 sm:text-sm ${
                playing ? "animate-swing-in" : ""
              }`}
              style={playing ? { animationDelay: "650ms" } : undefined}
            >
              Winner
            </p>
            {/* Small text on tangerine sits on the cocoa scrim to pass AA. */}
            <p className="inline-block rounded-full bg-scrim-on-tangerine px-3 py-1 font-display text-xs font-extrabold tracking-[0.06em] uppercase">
              The crew picked
            </p>
            <h2 id="result-heading" className="mt-3 pr-20 font-display text-[clamp(1.875rem,1.4rem+2.2vw,2.75rem)] leading-(--leading-tight) font-extrabold text-balance sm:pr-36">
              {lead.option.label}
            </h2>
            {lead.option.suggestedBy && (
              <p className="mt-3 inline-flex min-h-8 items-center gap-2 rounded-full bg-scrim-on-tangerine py-1 pr-4 pl-1 text-sm font-bold">
                <Avatar person={lead.option.suggestedBy} size={24} />
                Suggested by {lead.option.suggestedBy.name}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
              <p className="flex items-start font-display font-black tabular-nums">
                {/* The number counts up visually; assistive tech gets the final value once. */}
                <span className="sr-only">{lead.percent}%</span>
                <span aria-hidden="true" className="text-num">
                  {percent}
                </span>
                <span aria-hidden="true" className="mt-1 text-lg font-extrabold">
                  %
                </span>
              </p>
              <p className="mb-2 rounded-full bg-scrim-on-tangerine px-4 py-2 text-sm font-bold tabular-nums">{outcome.detail}</p>
            </div>
            <Tally votes={lead.votes} total={results.totalVotes} playing={playing} />

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Faces people={backersOf(lead.option.id)} size={34} playing={playing} delay={900} />
              <p className="rounded-full bg-scrim-on-tangerine px-3 py-1 text-sm font-bold">{peopleList(backersOf(lead.option.id))} backed it</p>
            </div>
          </div>
        )}

        {outcome.kind === "tie" && (
          <div className={`rounded-lg border-[2.5px] border-cocoa bg-tangerine p-6 text-cream-bright sm:p-8 ${playing ? "animate-drop-in" : ""}`}>
            <p className="inline-block rounded-full bg-scrim-on-tangerine px-3 py-1 font-display text-xs font-extrabold tracking-[0.06em] uppercase">
              Unfinished business
            </p>
            <h2 id="result-heading" className="mt-3 font-display text-[clamp(1.875rem,1.4rem+2.2vw,2.75rem)] leading-(--leading-tight) font-extrabold">
              It&rsquo;s a tie!
            </h2>
            <p className="mt-2 inline-block rounded-full bg-scrim-on-tangerine px-4 py-1.5 text-sm font-bold tabular-nums">{outcome.detail}</p>

            <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
              {results.leaders.map(({ option, votes }, index) => (
                <li
                  key={option.id}
                  className={`rounded-md border-2 border-cocoa bg-scrim-on-tangerine p-4 ${playing ? "animate-rise" : ""}`}
                  style={playing ? { animationDelay: `${350 + index * 140}ms` } : undefined}
                >
                  <p className="font-display text-lg font-extrabold text-balance">{option.label}</p>
                  <p className="mt-1 text-sm font-bold tabular-nums">{pluralVotes(votes)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Faces people={backersOf(option.id)} size={28} playing={playing} delay={600 + index * 140} />
                    <p className="text-sm">{peopleList(backersOf(option.id))}</p>
                  </div>
                </li>
              ))}
            </ul>
            {tieAction && <div className="mt-5">{tieAction}</div>}
          </div>
        )}

        {outcome.kind === "empty" && (
          <div className="rounded-lg border-[2.5px] border-cocoa bg-card p-6 sm:p-8">
            <h2 id="result-heading" className="font-display text-xl font-extrabold">
              {outcome.headline}
            </h2>
            <p className="mt-2 text-md text-cocoa-soft">{outcome.detail}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => copy(resultText)}
          className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-cocoa bg-cocoa px-6 font-display text-sm font-bold text-cream shadow-press-cocoa"
        >
          {copyState === "copied" ? <CheckIcon className="motion-safe:animate-check" /> : <CopyIcon />}
          {copyState === "copied" ? "Result copied" : "Copy result"}
        </button>
        {creatorActions}
      </div>
      <p role="status" className={copyState === "failed" ? "text-sm font-bold" : "sr-only"}>
        {copyState === "copied" ? "Result copied" : copyState === "failed" ? "Couldn’t copy the result." : ""}
      </p>

      {ranked.length > 0 && results.totalVotes > 0 && (
        <section aria-labelledby="standings-heading">
          <h2 id="standings-heading" className="font-display text-lg font-extrabold">
            Final standings
          </h2>
          <ol role="list" className="mt-3 rounded-lg border-[2.5px] border-cocoa bg-card px-5 sm:px-7">
            {ranked.map(({ option, votes, percent: share }, index) => {
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
                      <span className="font-display text-lg font-extrabold">{share}%</span>
                      <span className="text-sm text-cocoa-soft">{pluralVotes(votes)}</span>
                    </p>
                  </div>
                  <div aria-hidden="true" className="mt-3 h-3 overflow-hidden rounded-full bg-cream-deep">
                    <div
                      className={`h-full origin-left rounded-full bg-teal ${playing ? "animate-grow-x" : ""}`}
                      style={{ width: `${topVotes === 0 ? 0 : (votes / topVotes) * 100}%`, animationDelay: `${1100 + index * 90}ms` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-cocoa-soft">
                    <Faces people={backers} size={24} playing={playing} delay={1200 + index * 90} />
                    <span>{backers.length === 0 ? "Nobody backed it" : `${peopleList(backers)} backed it`}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <p aria-live="polite" className="sr-only">
        {announced}
      </p>
    </section>
  );
}
