import { z } from "zod";

const schema = z.object({
  /** Hosted Postgres (Neon). When unset outside production, a local PGlite database is used. */
  DATABASE_URL: z.url().optional(),
  PGLITE_DATA_DIR: z.string().default(".pglite"),
  /** Used to build share links, and as the auth base URL. Worked out on Vercel when unset (see below). */
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  /** Signs session cookies. Required in production; generate with `openssl rand -base64 32`. */
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  /** Vercel sets this for every deployment, so preview URLs can sign in too. */
  VERCEL_URL: z.string().optional(),
  /** Set by Vercel: "production", "preview" or "development". */
  VERCEL_ENV: z.string().optional(),
  /** Set by Vercel: the production domain, e.g. poll-creator-app.vercel.app. */
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  /** Local testing only: lets you log in as the sample creator (morgan@tiebreak.test) after seeding. */
  SAMPLE_CREATOR_PASSWORD: z.string().min(8).optional(),
});

export type Env = z.infer<typeof schema> & { NEXT_PUBLIC_APP_URL: string };

/**
 * The site's public base URL. An explicit NEXT_PUBLIC_APP_URL wins. Without it,
 * a Vercel deployment uses its own address, so share links never point at
 * localhost in production: the production domain on production, the
 * deployment's URL on previews.
 */
export function resolveAppUrl(vars: Pick<z.infer<typeof schema>, "NEXT_PUBLIC_APP_URL" | "VERCEL_URL" | "VERCEL_ENV" | "VERCEL_PROJECT_PRODUCTION_URL">): string {
  if (vars.NEXT_PUBLIC_APP_URL) return vars.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (vars.VERCEL_ENV === "production" && vars.VERCEL_PROJECT_PRODUCTION_URL) return `https://${vars.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (vars.VERCEL_URL) return `https://${vars.VERCEL_URL}`;
  return "http://localhost:3000";
}

let cached: Env | undefined;

/** Parsed lazily so `next build` doesn't need database credentials. */
export function env(): Env {
  if (cached) return cached;
  // An empty variable means "unset", so `DATABASE_URL= npm run dev` can override .env.local.
  const defined = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));
  const parsed = schema.safeParse(defined);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  cached = { ...parsed.data, NEXT_PUBLIC_APP_URL: resolveAppUrl(parsed.data) };
  return cached;
}
