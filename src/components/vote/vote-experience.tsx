"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { FormAlert } from "@/components/forms/form-alert";
import { PlusIcon } from "@/components/icons";
import { ClosesChip, StatusPill } from "@/components/poll/poll-meta";
import { Ballot } from "@/components/vote/ballot";
import { IdentityPicker } from "@/components/vote/identity-picker";
import { PollResult } from "@/components/vote/poll-result";
import { SheetDialog } from "@/components/vote/sheet-dialog";
import { SuggestDialog } from "@/components/vote/suggest-dialog";
import { usePublicPoll } from "@/components/vote/use-public-poll";
import { VotedState } from "@/components/vote/voted-state";
import type { PublicPollView } from "@/domain/views";
import { castBallot } from "@/lib/api/client";
import { castLabel, listNames } from "@/lib/vote/copy";
import { DEFAULT_IDENTITY, FACE_SEEDS, identityAsPerson, NAME_MAX_LENGTH, TINTS, type Identity } from "@/lib/vote/presets";

type Errors = { name?: string; ballot?: string };

/** The face a browser voted with, remembered locally so a return visit can greet them. */
const rememberKey = (slug: string) => `tiebreak:voted-as:${slug}`;

function readRemembered(slug: string): Identity | null {
  try {
    const value = JSON.parse(localStorage.getItem(rememberKey(slug)) ?? "null") as Identity | null;
    const valid =
      value &&
      typeof value.name === "string" &&
      (FACE_SEEDS as readonly string[]).includes(value.seed) &&
      TINTS.some((tint) => tint.value === value.tint);
    return valid ? value : null;
  } catch {
    return null;
  }
}

function remember(slug: string, identity: Identity) {
  try {
    localStorage.setItem(rememberKey(slug), JSON.stringify(identity));
  } catch {
    // Private mode or blocked storage: the page works without it.
  }
}

/**
 * Everything a voter sees at one link: the ballot, the "you're in" screen,
 * and the result once voting has closed. The three share a URL, so each
 * states plainly what it is, and the state is announced on load.
 */
export function VoteExperience({ poll: initial }: { poll: PublicPollView }) {
  const { view, refresh } = usePublicPoll(initial);
  const [identity, setIdentity] = useState<Identity>(DEFAULT_IDENTITY);
  const [remembered, setRemembered] = useState<Identity | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [attempted, setAttempted] = useState(false);
  const [wiggle, setWiggle] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [casting, setCasting] = useState(false);
  const [castFailure, setCastFailure] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState(false);
  const [localBallot, setLocalBallot] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestAsksName, setSuggestAsksName] = useState(false);
  const [notice, setNotice] = useState("");
  const [suggestionSent, setSuggestionSent] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const firstOptionRef = useRef<HTMLInputElement>(null);
  // One id per ballot for this page: a retried "Lock it in" can never count twice.
  const ballotId = useRef<string | null>(null);

  const open = view.status === "open";
  const votedOptionIds = view.viewerBallot?.optionIds ?? localBallot;
  const state = !open ? "result" : votedOptionIds ? "voted" : "ballot";
  // Options can disappear under the voter (never in practice, but be safe); drop them from the selection.
  const liveSelection = selected.filter((id) => view.options.some((option) => option.id === id));
  const selectedLabels = view.options.filter((option) => liveSelection.includes(option.id)).map((option) => option.label);

  // Read localStorage after mount only, so the server and first client render match.
  useEffect(() => {
    const timer = setTimeout(() => setRemembered(readRemembered(initial.slug)), 0);
    return () => clearTimeout(timer);
  }, [initial.slug]);

  // Screen-reader users should never wonder why the ballot is missing.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initial.status === "settled") setAnnouncement("Voting on this poll has closed. Here’s the result.");
      else if (initial.viewerBallot) setAnnouncement("You’ve already voted in this poll.");
    }, 500);
    return () => clearTimeout(timer);
  }, [initial.status, initial.viewerBallot]);

  // After a fresh vote, move focus to the confirmation so it's read out.
  useEffect(() => {
    if (justVoted) document.getElementById("voted-heading")?.focus();
  }, [justVoted]);

  function validate(nextIdentity = identity, nextSelection = liveSelection): Errors {
    return {
      name: nextIdentity.name.trim() ? undefined : "Add your name so the crew knows who voted.",
      ballot:
        nextSelection.length > 0 ? undefined : view.voteType === "multi" ? "Pick at least one option." : "Pick an option to vote for.",
    };
  }

  function changeIdentity(next: Identity) {
    setIdentity(next);
    if (attempted) setErrors(validate(next));
  }

  function changeSelection(next: string[]) {
    setSelected(next);
    if (attempted) setErrors(validate(identity, next));
  }

  function onCast() {
    setAttempted(true);
    const found = validate();
    setErrors(found);
    if (found.name || found.ballot) {
      setWiggle((count) => count + 1);
      return (found.name ? nameRef.current : firstOptionRef.current)?.focus();
    }
    setCastFailure(null);
    setConfirming(true);
  }

  async function onLockIn() {
    if (casting) return;
    setCasting(true);
    setCastFailure(null);
    ballotId.current ??= crypto.randomUUID();

    const result = await castBallot(view.slug, {
      ballotId: ballotId.current,
      voter: identityAsPerson(identity),
      optionIds: liveSelection,
    });
    setCasting(false);

    if (result.ok) {
      remember(view.slug, identity);
      setRemembered(identity);
      setLocalBallot(result.data.optionIds);
      setConfirming(false);
      setJustVoted(true);
      setAnnouncement(`Your vote for ${listNames(selectedLabels)} is in.`);
      void refresh();
      return;
    }

    switch (result.error.code) {
      case "ALREADY_VOTED":
        setConfirming(false);
        setNotice("This browser has already voted in this poll, so here’s that vote.");
        return void refresh();
      case "POLL_SETTLED":
        setConfirming(false);
        setNotice("Voting closed just before your vote landed, so it wasn’t counted.");
        return void refresh();
      case "INVALID_CHOICE":
        setConfirming(false);
        setNotice("That option isn’t on the ballot any more. Pick again.");
        setSelected([]);
        return void refresh();
      case "RATE_LIMITED":
        return setCastFailure("That\u2019s a lot of tries in a row. Wait a moment, then lock it in again.");
      case "INVALID_INPUT":
        return setCastFailure("Something in the form isn’t right. Check your name and try again.");
      default:
        return setCastFailure("That didn’t send. Check your connection and try again.");
    }
  }

  function openSuggest() {
    setSuggestAsksName(identity.name.trim() === "");
    setSuggesting(true);
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <StatusPill status={view.status} />
        {open && <ClosesChip closesAt={view.closesAt} />}
      </div>

      <h1 className="riso mt-5 font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em] text-pretty">
        {view.title}
      </h1>

      {notice && (
        <div className="mt-6">
          <FormAlert>{notice}</FormAlert>
        </div>
      )}

      <div className="mt-8">
        {state === "result" && <PollResult poll={view} />}

        {state === "voted" && (
          <VotedState poll={view} optionIds={votedOptionIds ?? []} identity={justVoted ? identity : remembered} justVoted={justVoted} />
        )}

        {state === "ballot" && (
          <div className="flex flex-col gap-8">
            <IdentityPicker identity={identity} onChange={changeIdentity} nameError={errors.name} nameRef={nameRef} />

            <div className="flex flex-col gap-4">
              <Ballot
                options={view.options}
                voteType={view.voteType}
                maxChoices={view.maxChoices}
                selected={liveSelection}
                onChange={changeSelection}
                error={errors.ballot}
                firstInputRef={firstOptionRef}
              />
              {view.suggestionsEnabled && (
                <button
                  type="button"
                  onClick={openSuggest}
                  className="flex min-h-11 w-fit items-center gap-2 rounded-full px-3 font-display text-sm font-bold text-cocoa underline-offset-4 hover:bg-cream-deep hover:underline"
                >
                  <PlusIcon />
                  Suggest something else
                </button>
              )}
              <p role="status" className={suggestionSent ? "text-sm text-cocoa motion-safe:animate-rise" : "sr-only"}>
                {suggestionSent && (
                  <>
                    Sent! If the organiser adds <strong className="font-bold">&ldquo;{suggestionSent}&rdquo;</strong>, it&rsquo;ll
                    show up on the ballot.
                  </>
                )}
              </p>
            </div>

            {/* The one obvious action, kept reachable while a long ballot scrolls. */}
            <div className="sticky bottom-0 z-10 -mx-4 border-t-2 border-cream-deep bg-cream/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
              <button
                key={wiggle}
                type="button"
                onClick={onCast}
                aria-disabled={!identity.name.trim() || liveSelection.length === 0 || undefined}
                className={`press min-h-14 w-full rounded-full border-2 border-cocoa bg-tangerine-deep px-6 font-display text-base font-bold text-balance text-cream-bright shadow-press-tangerine transition-opacity aria-disabled:opacity-60 ${
                  wiggle > 0 ? "motion-safe:animate-wiggle" : ""
                }`}
              >
                {castLabel(selectedLabels)}
              </button>
              {(!identity.name.trim() || liveSelection.length === 0) && (
                <p className="mt-2 text-center text-sm text-cocoa-soft">
                  {!identity.name.trim() && liveSelection.length === 0
                    ? "Add your name and pick an option to vote"
                    : !identity.name.trim()
                      ? "Add your name to vote"
                      : "Pick an option to vote"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <SheetDialog open={confirming} title={`Lock in ${listNames(selectedLabels)}?`} onClose={() => !casting && setConfirming(false)}>
        <div className="mt-4 flex items-center gap-3 rounded-md bg-cream-deep p-3">
          <Avatar person={identityAsPerson(identity)} size={40} />
          <p className="text-sm">
            Voting as <strong className="font-extrabold">{identity.name.trim().slice(0, NAME_MAX_LENGTH)}</strong>
          </p>
        </div>
        <p className="mt-4 text-md">No takebacks: once your vote is in, it can&rsquo;t be changed.</p>
        {castFailure && (
          <div className="mt-4">
            <FormAlert>{castFailure}</FormAlert>
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            aria-disabled={casting || undefined}
            className="min-h-12 rounded-full border-2 border-cocoa bg-card px-5 font-display font-bold hover:bg-cream-deep aria-disabled:opacity-60"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onLockIn}
            aria-disabled={casting || undefined}
            autoFocus
            className="press min-h-12 rounded-full border-2 border-cocoa bg-tangerine-deep px-6 font-display font-bold text-cream-bright shadow-press-tangerine aria-disabled:cursor-progress"
          >
            {casting ? "Locking it in…" : "Lock it in"}
          </button>
        </div>
      </SheetDialog>

      {view.suggestionsEnabled && open && (
        <SuggestDialog
          open={suggesting}
          slug={view.slug}
          identity={identity}
          onIdentityChange={changeIdentity}
          askForName={suggestAsksName}
          onClose={() => setSuggesting(false)}
          onSent={(label) => {
            setNotice("");
            setSuggestionSent(label);
          }}
          onStale={() => void refresh()}
        />
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
