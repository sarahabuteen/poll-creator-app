import "server-only";

import { redirect } from "next/navigation";
import { getSignedInCreator, type SignedInCreator } from "@/lib/api/session";

/** For creator pages: the signed-in creator, or a redirect to log in that comes back here. */
export async function requireSignedInCreator(returnTo: string): Promise<SignedInCreator> {
  const creator = await getSignedInCreator();
  if (!creator) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return creator;
}
