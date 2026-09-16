export type AvatarTint = "f8c9b9" | "cbe2d8" | "f6e0a4" | "e3d2f2";

export type Avatar = {
  seed: string;
  tint: AvatarTint;
};

export type Person = {
  name: string;
  avatar: Avatar;
};

export type SuggestionStatus = "pending" | "approved" | "declined";

export type PollOption = {
  id: string;
  label: string;
  source: "creator" | "suggestion";
  suggestionStatus?: SuggestionStatus;
  suggestedBy?: Person;
};

export type Vote = {
  optionId: string;
  voter: Person;
  voterToken: string;
  castAt: string;
};

export type Poll = {
  id: string;
  title: string;
  type: "single" | "multi";
  maxChoices: number;
  suggestionsEnabled: boolean;
  status: "open" | "settled";
  createdAt: string;
  closesAt: string;
  settledAt: string | null;
  options: PollOption[];
  votes: Vote[];
};

export type SampleData = {
  creator: Person;
  polls: Poll[];
};
