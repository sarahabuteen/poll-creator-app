"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DecisionToast } from "@/components/poll/decision-toast";
import { LEADER_CARD_ID, LeaderCard } from "@/components/poll/leader-card";
import { packRowId, PackList } from "@/components/poll/pack-list";
import { ClosesChip, CrewLine, LiveStatus, StatusPill } from "@/components/poll/poll-meta";
import { ShareDock } from "@/components/poll/share-dock";
import { approveButtonId, SuggestionCard } from "@/components/poll/suggestion-card";
import { useLivePoll } from "@/components/poll/use-live-poll";
import { useRaceAnnouncement } from "@/components/poll/use-race-announcement";
import type { CreatorPollView, SuggestionView } from "@/domain/views";
import { usePollBackend } from "@/components/poll/poll-backend";
import { failureCopy, type ModerationAction } from "@/lib/api/client";
import type { ApiResult } from "@/lib/api/types";
import { applyOverlays, type ModerationOverlay } from "@/lib/live/overlay";
import { deriveResults, pluralVotes, raceCall } from "@/lib/results";

type ToastState =
  | { kind: "decided"; decision: "approved" | "declined"; suggestion: SuggestionView }
  | { kind: "error"; message: string };

const TOAST_DISMISS_ID = "decision-toast-dismiss";

function failureMessage(result: Extract<ApiResult<unknown>, { ok: false }>): string {
  switch (result.error.code) {
    case "SUGGESTION_ALREADY_DECIDED":
      return "That suggestion has already been decided.";
    case "UNDO_UNAVAILABLE":
      // Written for people: "It's too late to undo that decision." etc.
      return result.error.message;
    case "POLL_SETTLED":
      return "Voting has ended, so the ballot can’t change now.";
    case "POLL_NOT_FOUND":
    case "SUGGESTION_NOT_FOUND":
      return "That suggestion isn’t there any more.";
    default:
      return "That didn’t go through. Try again.";
  }
}

/** The creator's live results: polled from the API, with moderation sent back to it. */
export function PollLiveView({ poll: initial, shareUrl }: { poll: CreatorPollView; shareUrl: string }) {
  const backend = usePollBackend();
  const live = useLivePoll(initial);
  const [ending, setEnding] = useState(false);
  const [overlays, setOverlays] = useState<ModerationOverlay[]>([]);
  const [justAdded, setJustAdded] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  // Where focus should land once React commits a moderation change. Every
  // handler that sets it also updates state, so the effect below always runs.
  const focusTarget = useRef<string | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(new Map<string, Promise<void>>());

  const view = useMemo(() => applyOverlays(live.view, overlays), [live.view, overlays]);
  const results = useMemo(() => deriveResults(view.options), [view.options]);
  const raceMessage = useRaceAnnouncement(results);
  const open = view.status === "open";

  // Live updates must never drop focus. If the row someone was on leaves the
  // pack (its option took the lead), send focus to where it went.
  const lastFocusedRow = useRef<string | null>(null);
  useEffect(() => {
    const track = (event: FocusEvent) => {
      const id = (event.target as HTMLElement | null)?.id ?? "";
      lastFocusedRow.current = id.startsWith("option-") ? id : null;
    };
    document.addEventListener("focusin", track);
    return () => document.removeEventListener("focusin", track);
  }, []);
  useLayoutEffect(() => {
    const rowId = lastFocusedRow.current;
    if (!rowId || document.activeElement !== document.body || document.getElementById(rowId)) return;
    const optionId = rowId.slice("option-".length);
    const nowLeading = results.leaders.some((leader) => leader.option.id === optionId);
    document.getElementById(nowLeading ? LEADER_CARD_ID : "results-heading")?.focus();
  }, [results]);

  useEffect(() => {
    const id = focusTarget.current;
    if (!id) return;
    focusTarget.current = null;
    const target =
      id === "undo" ? undoRef.current : (document.getElementById(id) ?? document.getElementById("results-heading"));
    target?.focus();
  });

  function withJustAdded(id: string, added: boolean) {
    setJustAdded((current) => {
      const next = new Set(current);
      if (added) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /**
   * Shows the decision straight away, then confirms it with the server. The
   * overlay stays until a fresh view has been fetched, so a poll landing
   * mid-request can't flash the old state. Returns a failure message, if any.
   */
  async function send(suggestion: SuggestionView, action: ModerationAction, to: ModerationOverlay["to"]) {
    const overlay: ModerationOverlay = { suggestion, to };
    // Only remove this request's own overlay: a newer decision (a quick Undo) may have replaced it.
    const clear = () => setOverlays((current) => current.filter((item) => item !== overlay));
    setOverlays((current) => [...current.filter((item) => item.suggestion.id !== suggestion.id), overlay]);

    // Requests about the same suggestion go to the server in order, so an Undo
    // pressed while "Add it" is still in flight can't arrive first.
    const previous = inFlight.current.get(suggestion.id) ?? Promise.resolve();
    const request = previous.then(() => backend.moderate(view.slug, suggestion.id, action));
    const settled = request.then(() => undefined, () => undefined);
    inFlight.current.set(suggestion.id, settled);
    const result = await request;
    if (inFlight.current.get(suggestion.id) === settled) inFlight.current.delete(suggestion.id);

    if (result.ok) {
      await live.refresh();
      clear();
      return null;
    }
    clear();
    if (result.status === 401) {
      backend.onUnauthenticated();
      return null;
    }
    void live.refresh();
    return failureMessage(result);
  }

  function fail(message: string, focus: string) {
    setToast({ kind: "error", message });
    setModerationMessage(message);
    focusTarget.current = focus;
  }

  async function approve(suggestion: SuggestionView) {
    withJustAdded(suggestion.id, true);
    setToast({ kind: "decided", decision: "approved", suggestion });
    setModerationMessage(`${suggestion.label} added to the ballot with 0 votes. Undo is available.`);
    focusTarget.current = packRowId(suggestion.id);

    const failure = await send(suggestion, "approve", "approved");
    if (failure) {
      withJustAdded(suggestion.id, false);
      fail(failure, approveButtonId(suggestion.id));
    }
  }

  async function decline(suggestion: SuggestionView) {
    setToast({ kind: "decided", decision: "declined", suggestion });
    setModerationMessage(`Declined ${suggestion.suggestedBy.name}’s suggestion, ${suggestion.label}. Undo is available.`);
    focusTarget.current = "undo";

    const failure = await send(suggestion, "decline", "declined");
    if (failure) fail(failure, approveButtonId(suggestion.id));
  }

  async function undo() {
    if (toast?.kind !== "decided" || undoing) return;
    const { suggestion } = toast;
    setUndoing(true);
    const failure = await send(suggestion, "undo", "pending");
    setUndoing(false);

    if (failure) return fail(failure, TOAST_DISMISS_ID);
    withJustAdded(suggestion.id, false);
    setToast(null);
    setModerationMessage(`${suggestion.label} is back in your pending suggestions.`);
    focusTarget.current = approveButtonId(suggestion.id);
  }

  // When voting closes (by deadline or from another tab), the page becomes the reveal.
  const settled = live.view.status === "settled";
  useEffect(() => {
    if (settled) backend.refreshPage();
  }, [settled, backend]);

  async function onEndVoting() {
    if (ending) return;
    setEnding(true);
    const result = await backend.endVoting(view.slug);
    if (result.ok || result.error.code === "POLL_SETTLED") return backend.refreshPage();
    setEnding(false);
    if (result.status === 401) return backend.onUnauthenticated();
    fail(failureCopy(result, "Voting didn\u2019t end"), "results-heading");
  }

  function dismissToast() {
    setToast(null);
    focusTarget.current = "pending-heading";
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <StatusPill status={view.status} />
        {open && <ClosesChip closesAt={view.closesAt} />}
      </div>

      <h1 className="riso mt-5 font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em] text-pretty text-cocoa">
        {view.title}
      </h1>

      <div className="mt-5">
        <CrewLine voters={view.voters} />
      </div>

      <section aria-labelledby="results-heading" className="mt-10 flex flex-col gap-8">
        <h2 id="results-heading" tabIndex={-1} className="sr-only">
          Results so far
        </h2>

        {results.leaders.length > 0 ? (
          // Keyed by who's ahead, so a new leader's tally doesn't stamp in the old one's votes.
          <LeaderCard key={results.leaders.map((leader) => leader.option.id).join("|")} results={results} />
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
          {pluralVotes(results.totalVotes)} in &mdash; <span className="text-accent-text">{raceCall(results)}</span>
        </p>
        <LiveStatus status={view.status} connection={live.connection} />
      </div>

      {open && (
        <section aria-labelledby="pending-heading" className="mt-8 flex flex-col gap-6">
          <h2 id="pending-heading" tabIndex={-1} className="sr-only">
            Suggestions waiting on you
          </h2>
          {view.pendingSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApprove={() => approve(suggestion)}
              onDecline={() => decline(suggestion)}
            />
          ))}
          {/* Empty states say what would appear here, so an empty space never looks broken. */}
          {view.pendingSuggestions.length === 0 && (
            <p className="rounded-lg border-2 border-dashed border-cocoa-faint px-5 py-4 text-sm text-cocoa-soft">
              {view.suggestionsEnabled
                ? "No suggestions waiting. When someone in your crew suggests an option, it shows up here for you to add or pass on."
                : "Suggestions are off for this poll, so the ballot stays as you set it."}
            </p>
          )}
        </section>
      )}

      <div className="mt-8">
        <ShareDock shareUrl={shareUrl} onEndVoting={onEndVoting} ending={ending} />
      </div>

      {toast && (
        <DecisionToast
          toast={toast.kind === "error" ? toast : { kind: "decided", decision: toast.decision, label: toast.suggestion.label }}
          busy={undoing}
          undoRef={undoRef}
          dismissId={TOAST_DISMISS_ID}
          onUndo={undo}
          onDismiss={dismissToast}
        />
      )}

      {/* One region narrates the race (throttled); one reports moderation outcomes. */}
      <p aria-live="polite" className="sr-only">
        {raceMessage}
      </p>
      <p aria-live="polite" className="sr-only">
        {moderationMessage}
      </p>
    </>
  );
}
