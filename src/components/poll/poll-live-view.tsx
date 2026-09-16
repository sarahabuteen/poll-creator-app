"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LeaderCard } from "@/components/poll/leader-card";
import { packRowId, PackList } from "@/components/poll/pack-list";
import { ClosesChip, CrewLine, StatusPill } from "@/components/poll/poll-meta";
import { ShareDock } from "@/components/poll/share-dock";
import { approveButtonId, SuggestionCard } from "@/components/poll/suggestion-card";
import { deriveResults, pendingSuggestions, pluralVotes, raceCall } from "@/lib/results";
import type { Poll, PollOption, SuggestionStatus } from "@/lib/types";

type Declined = { option: PollOption };

export function PollLiveView({ poll: initialPoll }: { poll: Poll }) {
  const [options, setOptions] = useState(initialPoll.options);
  const [justAdded, setJustAdded] = useState<ReadonlySet<string>>(new Set());
  const [declined, setDeclined] = useState<Declined | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Where focus should land once React commits a moderation change. Every
  // handler that sets it also updates state, so the effect below always runs.
  const focusTarget = useRef<string | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);

  const poll = useMemo(() => ({ ...initialPoll, options }), [initialPoll, options]);
  const results = useMemo(() => deriveResults(poll), [poll]);
  const pending = pendingSuggestions(poll);

  useEffect(() => {
    const id = focusTarget.current;
    if (!id) return;
    focusTarget.current = null;
    const target =
      id === "undo" ? undoRef.current : (document.getElementById(id) ?? document.getElementById("results-heading"));
    target?.focus();
  });

  function setStatus(optionId: string, status: SuggestionStatus) {
    setOptions((current) =>
      current.map((option) => (option.id === optionId ? { ...option, suggestionStatus: status } : option)),
    );
  }

  function approve(option: PollOption) {
    setStatus(option.id, "approved");
    setJustAdded((current) => new Set(current).add(option.id));
    setDeclined(null);
    setAnnouncement(`${option.label} added to the ballot with 0 votes.`);
    focusTarget.current = packRowId(option.id);
  }

  function decline(option: PollOption) {
    setStatus(option.id, "declined");
    setDeclined({ option });
    setAnnouncement(`Declined ${option.suggestedBy?.name}’s suggestion, ${option.label}. Undo is available.`);
    focusTarget.current = "undo";
  }

  function undoDecline() {
    if (!declined) return;
    const { option } = declined;
    setStatus(option.id, "pending");
    setDeclined(null);
    setAnnouncement(`${option.label} is back in your pending suggestions.`);
    focusTarget.current = approveButtonId(option.id);
  }

  function dismissToast() {
    setDeclined(null);
    focusTarget.current = "pending-heading";
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <StatusPill />
        <ClosesChip closesAt={poll.closesAt} />
      </div>

      <h1 className="riso mt-5 font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em] text-pretty text-cocoa">
        {poll.title}
      </h1>

      <div className="mt-5">
        <CrewLine votes={poll.votes} />
      </div>

      <section aria-labelledby="results-heading" className="mt-10 flex flex-col gap-8">
        <h2 id="results-heading" tabIndex={-1} className="sr-only">
          Results so far
        </h2>

        {results.leaders.length > 0 ? (
          <LeaderCard results={results} />
        ) : (
          <div className="rounded-lg border-[2.5px] border-cocoa bg-card p-6 sm:p-7">
            <p className="font-display text-lg font-extrabold text-cocoa">No votes yet, so nobody&rsquo;s leading.</p>
            <p className="mt-2 text-cocoa-soft">The link works. Drop it in the group chat and the race starts here.</p>
          </div>
        )}

        <PackList pack={results.pack} justAdded={justAdded} />
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-2">
        <p className="font-display text-base font-bold text-cocoa tabular-nums">
          {pluralVotes(results.totalVotes)} in &mdash; <span className="text-tangerine-deep">{raceCall(results)}</span>
        </p>
        <p className="flex items-center gap-2 text-sm text-cocoa-soft">
          <span aria-hidden="true" className="relative flex size-4 items-center justify-center rounded-full bg-teal-soft">
            <span className="size-2 rounded-full bg-teal motion-safe:animate-pulse" />
          </span>
          Live &mdash; updates as votes land
        </p>
      </div>

      {poll.suggestionsEnabled && (pending.length > 0 || declined) && (
        <section aria-labelledby="pending-heading" className="mt-8 flex flex-col gap-6">
          <h2 id="pending-heading" tabIndex={-1} className="sr-only">
            Suggestions waiting on you
          </h2>
          {pending.map((option) =>
            option.suggestedBy ? (
              <SuggestionCard
                key={option.id}
                suggestion={{ ...option, suggestedBy: option.suggestedBy }}
                onApprove={() => approve(option)}
                onDecline={() => decline(option)}
              />
            ) : null,
          )}
        </section>
      )}

      <div className="mt-8">
        <ShareDock shareUrl={poll.shareUrl} />
      </div>

      {declined && (
        <div className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-form flex-wrap items-center gap-3 rounded-lg border-[2.5px] border-cocoa bg-card p-3 pl-5 sm:rounded-full">
          <p className="min-w-0 flex-1 text-sm text-cocoa">
            Not this time for <strong className="font-extrabold">&ldquo;{declined.option.label}&rdquo;</strong>
          </p>
          <button
            ref={undoRef}
            type="button"
            onClick={undoDecline}
            className="press min-h-11 rounded-full border-2 border-cocoa bg-cocoa px-5 font-display text-sm font-bold text-cream shadow-press-cocoa"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={dismissToast}
            className="min-h-11 rounded-full px-4 font-display text-sm font-bold text-cocoa-soft hover:bg-cream-deep hover:text-cocoa"
          >
            Dismiss
          </button>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
