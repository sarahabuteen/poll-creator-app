import { Avatar } from "@/components/avatar";
import type { SuggestionView } from "@/domain/views";

type SuggestionCardProps = {
  suggestion: SuggestionView;
  onApprove: () => void;
  onDecline: () => void;
};

export function approveButtonId(optionId: string) {
  return `approve-${optionId}`;
}

/** A pending voter suggestion, moderated like a host rather than an admin panel. */
export function SuggestionCard({ suggestion, onApprove, onDecline }: SuggestionCardProps) {
  const { suggestedBy, label } = suggestion;

  return (
    <article className="relative flex flex-col gap-4 rounded-lg border-[2.5px] border-cocoa bg-card p-5 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
      {/* Speech-bubble tail */}
      <span
        aria-hidden="true"
        className="absolute -top-[11px] left-10 size-5 rotate-45 border-t-[2.5px] border-l-[2.5px] border-cocoa bg-card"
      />

      <div className="flex min-w-0 flex-1 items-start gap-4">
        <Avatar person={suggestedBy} size={50} />
        <div className="min-w-0">
          <h3 className="text-md font-extrabold text-cocoa">
            {suggestedBy.name} suggested: &ldquo;{label}&rdquo;
          </h3>
          <p className="mt-1 text-sm text-cocoa-soft">
            Approve it and it joins with 0 votes &mdash; your call, house rules
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          id={approveButtonId(suggestion.id)}
          onClick={onApprove}
          className="press min-h-11 rounded-full border-2 border-cocoa bg-teal px-6 font-display text-base font-bold text-cream shadow-press-teal hover:bg-teal-deep"
        >
          Add it
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="min-h-11 rounded-full px-4 font-display text-base font-bold text-cocoa-soft hover:bg-cream-deep hover:text-cocoa"
        >
          Not this time
        </button>
      </div>
    </article>
  );
}
