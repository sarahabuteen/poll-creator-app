import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db/client";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth/cookies";
import { env } from "@/lib/env";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/validation";


// Only for local development and tests, never production (see env check below).
const DEV_SECRET = "tiebreak-local-development-secret-not-for-production";

function createAuth() {
  const config = env();
  if (process.env.NODE_ENV === "production" && !config.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required in production.");
  }

  return betterAuth({
    appName: "Tiebreak",
    baseURL: config.NEXT_PUBLIC_APP_URL,
    secret: config.BETTER_AUTH_SECRET ?? DEV_SECRET,
    trustedOrigins: [config.NEXT_PUBLIC_APP_URL, ...(config.VERCEL_URL ? [`https://${config.VERCEL_URL}`] : [])],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      // Signing up logs you straight in: the next step is making a poll, not checking email.
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      database: { generateId: () => crypto.randomUUID() },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { tiebreakAuth?: Auth };

/** Created on first use, so builds and tests don't need auth configuration up front. */
export function getAuth(): Auth {
  globalForAuth.tiebreakAuth ??= createAuth();
  return globalForAuth.tiebreakAuth;
}

/** Resets the cached instance; tests use this after swapping the database. */
export function resetAuthForTests() {
  globalForAuth.tiebreakAuth = undefined;
}
