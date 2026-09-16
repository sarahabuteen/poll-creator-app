import raw from "../../data/sample-polls.json";
import type { Poll, SampleData } from "./types";

const data = raw as SampleData;

export const creator = data.creator;

export function getPolls(): Poll[] {
  return data.polls;
}

export function getPoll(id: string): Poll | undefined {
  return data.polls.find((poll) => poll.id === id);
}
