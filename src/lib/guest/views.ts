import { effectiveState, isOnBallot, UNDO_WINDOW_MS } from "@/domain/rules";
import type { BallotOptionView, CreatorPollSummary, CreatorPollView, Person, PublicPollView, SuggestionView } from "@/domain/views";
import { guestViewerBallot } from "./actions";
import { deriveResults } from "@/lib/results";
import type { GuestOption, GuestPoll } from "./shift";

const stateOf = (poll: GuestPoll) => ({
  status: poll.status,
  closesAt: new Date(poll.closesAt),
  settledAt: poll.settledAt ? new Date(poll.settledAt) : null,
});

const ballotState = (option: GuestOption) => ({
  id: option.id,
  source: option.source,
  suggestionStatus: option.suggestionStatus ?? null,
});

/**
 * The same creator view the real API returns, built from guest data in the
 * browser. Attribution follows the real rule: backers only once settled.
 */
export function guestCreatorView(poll: GuestPoll, now: Date): CreatorPollView {
  const state = effectiveState(stateOf(poll), now);
  const settled = state.status === "settled";
  const votesByOption = (id: string) =>
    poll.votes.filter((vote) => vote.optionId === id).sort((a, b) => a.castAt.localeCompare(b.castAt));

  const options = poll.options.filter((option) => isOnBallot(ballotState(option))).map(
    (option): BallotOptionView => ({
      id: option.id,
      label: option.label,
      source: option.source,
      suggestedBy: option.suggestedBy ?? null,
      votes: votesByOption(option.id).length,
      backers: settled ? votesByOption(option.id).map((vote) => vote.voter) : null,
    }),
  );

  const voters = new Map<string, Person & { castAt: string }>();
  for (const vote of [...poll.votes].sort((a, b) => b.castAt.localeCompare(a.castAt))) {
    if (!voters.has(vote.voterToken)) voters.set(vote.voterToken, { ...vote.voter, castAt: vote.castAt });
  }

  const suggestion = (option: GuestOption): SuggestionView => ({
    id: option.id,
    label: option.label,
    suggestedBy: option.suggestedBy!,
    createdAt: option.createdAt ?? poll.createdAt,
  });

  return {
    audience: "creator",
    slug: poll.id,
    title: poll.title,
    voteType: poll.type,
    maxChoices: poll.maxChoices,
    suggestionsEnabled: poll.suggestionsEnabled,
    status: state.status,
    closesAt: poll.closesAt,
    settledAt: state.settledAt?.toISOString() ?? null,
    endedEarly: state.endedEarly,
    createdAt: poll.createdAt,
    options,
    totalVotes: options.reduce((sum, option) => sum + option.votes, 0),
    voters: [...voters.values()],
    pendingSuggestions: poll.options.filter((option) => option.suggestionStatus === "pending" && option.suggestedBy).map(suggestion),
    undoableDecisions: poll.options
      .filter(
        (option) =>
          option.decidedAt &&
          option.suggestionStatus !== "pending" &&
          now.getTime() - Date.parse(option.decidedAt) <= UNDO_WINDOW_MS,
      )
      .map((option) => ({
        ...suggestion(option),
        decision: option.suggestionStatus as "approved" | "declined",
        decidedAt: option.decidedAt!,
        undoUntil: new Date(Date.parse(option.decidedAt!) + UNDO_WINDOW_MS).toISOString(),
      })),
  };
}

/** The dashboard row for a guest poll, matching GET /api/creator/polls. */
export function guestSummary(poll: GuestPoll, now: Date): CreatorPollSummary {
  const view = guestCreatorView(poll, now);
  const { leaders } = deriveResults(view.options);
  return {
    slug: view.slug,
    title: view.title,
    status: view.status,
    closesAt: view.closesAt,
    settledAt: view.settledAt,
    endedEarly: view.endedEarly,
    createdAt: view.createdAt,
    totalVotes: view.totalVotes,
    voterCount: view.voters.length,
    pendingSuggestions: view.status === "open" ? view.pendingSuggestions.length : 0,
    leaders: leaders.map((leader) => ({ label: leader.option.label, votes: leader.votes })),
  };
}

/** The vote page's view of a guest poll, matching GET /api/polls/:slug for this browser. */
export function guestPublicView(poll: GuestPoll, now: Date, voterToken: string | null): PublicPollView {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { audience, pendingSuggestions, undoableDecisions, ...shared } = guestCreatorView(poll, now);
  return { ...shared, audience: "public", viewerBallot: guestViewerBallot(poll, voterToken) };
}
