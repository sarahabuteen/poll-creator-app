import raw from "../../data/sample-polls.json";
import type { SampleData } from "./types";

/** Stand-in signed-in creator for the header until creator accounts exist (scope 2). */
export const creator = (raw as SampleData).creator;
