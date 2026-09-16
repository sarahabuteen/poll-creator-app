import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth/auth";

/** Better Auth's HTTP API: sign up, sign in, sign out and get session, under /api/auth/*. */
export const GET = (request: Request) => toNextJsHandler(getAuth()).GET(request);
export const POST = (request: Request) => toNextJsHandler(getAuth()).POST(request);
