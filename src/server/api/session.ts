import type { NextRequest, NextResponse } from "next/server";
import { SAMPLE_CREATOR_ID } from "@/db/seed";
import { ApiError } from "./http";

/**
 * Casual one-vote-per-browser: the server issues an opaque token in an
 * httpOnly cookie, so scripts on the page can't read or swap it.
 */
export const VOTER_COOKIE = "tiebreak_voter";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

export function readVoterToken(request: NextRequest): string | undefined {
  return request.cookies.get(VOTER_COOKIE)?.value;
}

export function voterTokenFor(request: NextRequest): { token: string; isNew: boolean } {
  const existing = readVoterToken(request);
  if (existing) return { token: existing, isNew: false };
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return { token: Buffer.from(bytes).toString("base64url"), isNew: true };
}

export function setVoterCookie(response: NextResponse, token: string) {
  response.cookies.set(VOTER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_S,
  });
}

/**
 * TODO(scope 2): resolve the signed-in creator from the auth session.
 * Until then creator endpoints act as the sample creator in development, and
 * are closed in production so nobody can moderate or end the demo polls.
 */
export function requireCreatorId(): string {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in to manage polls.");
  }
  return SAMPLE_CREATOR_ID;
}
