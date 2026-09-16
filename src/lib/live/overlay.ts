import type { CreatorPollView, SuggestionView } from "@/domain/views";

/**
 * A moderation decision the creator has made but the server hasn't confirmed
 * yet. Overlays sit on top of every polled view until the request settles, so
 * a refresh landing mid-request can't flicker the old state back in.
 */
export type ModerationOverlay = {
  suggestion: SuggestionView;
  /** Where the suggestion should end up. */
  to: "approved" | "declined" | "pending";
};

export function applyOverlays(view: CreatorPollView, overlays: readonly ModerationOverlay[]): CreatorPollView {
  if (overlays.length === 0) return view;

  let options = view.options;
  let pending = view.pendingSuggestions;

  for (const { suggestion, to } of overlays) {
    const onBallot = options.some((option) => option.id === suggestion.id);
    const isPending = pending.some((item) => item.id === suggestion.id);

    if (to === "approved") {
      pending = pending.filter((item) => item.id !== suggestion.id);
      if (!onBallot) {
        options = [
          ...options,
          { id: suggestion.id, label: suggestion.label, source: "suggestion", suggestedBy: suggestion.suggestedBy, votes: 0, backers: null },
        ];
      }
    } else if (to === "declined") {
      pending = pending.filter((item) => item.id !== suggestion.id);
      options = options.filter((option) => option.id !== suggestion.id);
    } else {
      options = options.filter((option) => option.id !== suggestion.id);
      if (!isPending) {
        pending = [...pending, suggestion].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      }
    }
  }

  return { ...view, options, pendingSuggestions: pending };
}
