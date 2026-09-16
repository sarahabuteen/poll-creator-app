"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { closingFocusId, ClosingTimeField, useClosingTime } from "@/components/create/closing-time-field";
import { FormAlert } from "@/components/forms/form-alert";
import { SheetDialog } from "@/components/vote/sheet-dialog";
import { loginUrlForCurrentPage, reopenVoting } from "@/lib/api/client";
import { closingTimeError } from "@/lib/create/closing";

type ReopenDialogProps = {
  open: boolean;
  slug: string;
  /** True when reopening to break a tie, which changes the framing, not the action. */
  breakingTie: boolean;
  onClose: () => void;
};

/**
 * Reopening undoes the group's decision, so it's a confirmed step (never a
 * one-tap action) and always comes with a fresh closing time.
 */
export function ReopenDialog({ open, slug, breakingTie, onClose }: ReopenDialogProps) {
  const router = useRouter();
  const closing = useClosingTime();
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (pending || !closing.now) return;
    const invalid = closingTimeError(closing.closesAt, closing.now);
    setError(invalid);
    setFailure(null);
    if (invalid) return document.getElementById(closingFocusId(closing, "reopen-closing"))?.focus();

    setPending(true);
    const result = await reopenVoting(slug, closing.closesAt!);
    if (result.ok || result.error.code === "POLL_ALREADY_OPEN") {
      // The page re-renders as the live poll.
      router.refresh();
      return onClose();
    }
    setPending(false);
    if (result.status === 401) return window.location.assign(loginUrlForCurrentPage());
    setFailure(
      result.error.code === "CLOSING_TIME_INVALID"
        ? result.error.message
        : "That didn’t go through. Check your connection and try again.",
    );
  }

  return (
    <SheetDialog open={open} title={breakingTie ? "Break the tie: reopen voting?" : "Reopen voting?"} onClose={() => !pending && onClose()}>
      <p className="mt-3 text-md">
        {breakingTie
          ? "Voting starts again with the same crew and the same ballot. Votes already cast stay in, so new voters decide it."
          : "This undoes the result: the winner goes away and voting starts again. Votes already cast stay in."}
      </p>
      {failure && (
        <div className="mt-4">
          <FormAlert>{failure}</FormAlert>
        </div>
      )}
      <ClosingTimeField closing={closing} error={error} legend="Voting closes again" idPrefix="reopen-closing" className="mt-5" />
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-disabled={pending || undefined}
          className="min-h-12 rounded-full border-2 border-cocoa bg-card px-5 font-display font-bold hover:bg-cream-deep"
        >
          Keep it settled
        </button>
        <button
          type="button"
          onClick={confirm}
          aria-disabled={pending || undefined}
          className="press min-h-12 rounded-full border-2 border-cocoa bg-cocoa px-6 font-display font-bold text-cream shadow-press-cocoa aria-disabled:cursor-progress"
        >
          {pending ? "Reopening…" : "Reopen voting"}
        </button>
      </div>
    </SheetDialog>
  );
}
