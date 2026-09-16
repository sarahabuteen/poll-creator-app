import type { AVATAR_TINTS } from "./inputs";

/**
 * What the server sends to the page. These shapes are the attribution rule in
 * type form: while a poll is open nothing links a voter to an option, and
 * `backers` only exists once the poll has settled.
 */

export type AvatarTint = (typeof AVATAR_TINTS)[number];

export type Person = {
  name: string;
  avatar: { seed: string; tint: AvatarTint };
};

export type BallotOptionView = {
  id: string;
  label: string;
  source: "creator" | "suggestion";
  suggestedBy: Person | null;
  votes: number;
  /** Who voted for it, revealed at close. Always null while voting is open. */
  backers: Person[] | null;
};

export type SuggestionView = {
  id: string;
  label: string;
  suggestedBy: Person;
  createdAt: string;
};

/** A moderation decision the creator can still take back from the undo toast. */
export type UndoableDecisionView = SuggestionView & {
  decision: "approved" | "declined";
  decidedAt: string;
  undoUntil: string;
};

export type VoterView = Person & { castAt: string };

export type PollView = {
  slug: string;
  title: string;
  voteType: "single" | "multi";
  maxChoices: number;
  suggestionsEnabled: boolean;
  /** Interpreted against the clock: a poll past its closing time is settled. */
  status: "open" | "settled";
  closesAt: string;
  settledAt: string | null;
  endedEarly: boolean;
  createdAt: string;
  /** On the ballot (creator options and approved suggestions), in ballot order. */
  options: BallotOptionView[];
  totalVotes: number;
  /** Who has voted, most recent first, without what they voted for. */
  voters: VoterView[];
};

export type PublicPollView = PollView & {
  audience: "public";
  /** The requesting browser's own ballot, if it has cast one. */
  viewerBallot: { optionIds: string[]; castAt: string } | null;
};

export type CreatorPollView = PollView & {
  audience: "creator";
  pendingSuggestions: SuggestionView[];
  undoableDecisions: UndoableDecisionView[];
};
