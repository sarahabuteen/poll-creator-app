import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth/cookies";

/**
 * A fast, optimistic gate for creator pages: no session cookie, straight to
 * log in. It doesn't check the database, so pages and API routes still verify
 * the session for real. Vote links (/p/...) are never matched: voters must
 * never hit a login wall.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX })) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/", "/polls/:path*", "/dashboard/:path*", "/closed/:path*"],
};
