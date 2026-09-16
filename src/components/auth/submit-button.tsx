import type { ReactNode } from "react";

/** The form's one primary action. Stays focusable while pending so focus isn't lost mid-request. */
export function SubmitButton({ pending, pendingLabel, children }: { pending: boolean; pendingLabel: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      aria-disabled={pending || undefined}
      className="press min-h-12 w-full rounded-full border-2 border-cocoa bg-tangerine-deep px-6 font-display text-base font-bold text-cream-bright shadow-press-tangerine aria-disabled:cursor-progress aria-disabled:opacity-80"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
