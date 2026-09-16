/** The shape of data/sample-polls.json. App code uses the views in `@/domain/views`. */

import type { Person } from "@/domain/views";

export type SamplePollOption = {
  id: string;
  label: string;
  source: "creator" | "suggestion";
  suggestionStatus?: "pending" | "approved" | "declined";
  suggestedBy?: Person;
};

export type SampleVote = {
  optionId: string;
  voter: Person;
  voterToken: string;
  castAt: string;
};

export type SamplePoll = {
  id: string;
  title: string;
  type: "single" | "multi";
  maxChoices: number;
  suggestionsEnabled: boolean;
  status: "open" | "settled";
  createdAt: string;
  closesAt: string;
  settledAt: string | null;
  options: SamplePollOption[];
  votes: SampleVote[];
};

export type SampleData = {
  creator: Person;
  polls: SamplePoll[];
};
