import { getAuth } from "./auth";

export type Creator = { id: string; name: string; email: string };

/** The signed-in creator for this request, or null. Validates the session against the database. */
export async function getCreator(headers: Headers): Promise<Creator | null> {
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
}
