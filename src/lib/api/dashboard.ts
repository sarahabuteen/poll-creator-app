import "server-only";

import type { CreatorDashboardView } from "@/domain/views";
import { serverApi } from "./server";

/** The signed-in creator's polls, or null if the dashboard API couldn't be reached. */
export async function loadDashboard(): Promise<CreatorDashboardView | null> {
  const result = await serverApi<CreatorDashboardView>("/api/creator/polls");
  return result.ok ? result.data : null;
}
