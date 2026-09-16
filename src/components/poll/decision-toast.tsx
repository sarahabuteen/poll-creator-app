"use client";

import type { Ref } from "react";
import { WarningIcon } from "@/components/icons";

export type Toast =
  | { kind: "decided"; decision: "approved" | "declined"; label: string }
  | { kind: "error"; message: string };

type DecisionToastProps = {
  toast: Toast;
  busy: boolean;
  undoRef: Ref<HTMLButtonElement>;
  /** Lets focus move to Dismiss when Undo disappears after a failure. */
  dismissId: string;
  onUndo: () => void;
  onDismiss: () => void;
};

/**
 * Moderation feedback. Decisions get an Undo (declining is a social act, and
 * approving is undoable too); failures say so plainly. It never times out on
 * its own, so nobody has to race it (WCAG 2.2.1).
 */
export function DecisionToast({ toast, busy, undoRef, dismissId, onUndo, onDismiss }: DecisionToastProps) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-form flex-wrap items-center gap-3 rounded-lg border-[2.5px] border-cocoa bg-card p-3 pl-5 sm:rounded-full">
      <p className="flex min-w-0 flex-1 basis-full items-start gap-2 text-sm text-cocoa sm:basis-0">
        {toast.kind === "error" ? (
          <>
            <WarningIcon size={16} className="mt-0.5 shrink-0" />
            {toast.message}
          </>
        ) : toast.decision === "approved" ? (
          <span>
            Added <strong className="font-extrabold">&ldquo;{toast.label}&rdquo;</strong> with 0 votes
          </span>
        ) : (
          <span>
            Not this time for <strong className="font-extrabold">&ldquo;{toast.label}&rdquo;</strong>
          </span>
        )}
      </p>
      {toast.kind === "decided" && (
        <button
          ref={undoRef}
          type="button"
          onClick={onUndo}
          aria-disabled={busy || undefined}
          className="press min-h-11 rounded-full border-2 border-cocoa bg-cocoa px-5 whitespace-nowrap font-display text-sm font-bold text-cream shadow-press-cocoa aria-disabled:cursor-progress aria-disabled:opacity-80"
        >
          {busy ? "Undoing…" : "Undo"}
        </button>
      )}
      <button
        id={dismissId}
        type="button"
        onClick={onDismiss}
        className="min-h-11 rounded-full px-4 font-display text-sm font-bold whitespace-nowrap text-cocoa-soft hover:bg-cream-deep hover:text-cocoa"
      >
        Dismiss
      </button>
    </div>
  );
}
