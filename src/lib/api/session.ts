import "server-only";

import type { Person } from "@/domain/views";
import { serverApi } from "./server";

export type SignedInCreator = { id: string; name: string; email: string };

/** The signed-in creator, checked through the auth API (not just the cookie), or null. */
export async function getSignedInCreator(): Promise<SignedInCreator | null> {
  const result = await serverApi<{ user: SignedInCreator } | null>("/api/auth/get-session");
  if (!result.ok || !result.data) return null;
  const { id, name, email } = result.data.user;
  return { id, name, email };
}

/** Creators don't pick an avatar yet (saved identity is a stretch goal), so derive a stable one. */
export function creatorAsPerson(creator: Pick<SignedInCreator, "id" | "name">): Person {
  return { name: creator.name, avatar: { seed: creator.id, tint: "cbe2d8" } };
}
