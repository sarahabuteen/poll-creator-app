import { z } from "zod";

const schema = z.object({
  /** Hosted Postgres (Neon). When unset outside production, a local PGlite database is used. */
  DATABASE_URL: z.url().optional(),
  PGLITE_DATA_DIR: z.string().default(".pglite"),
  /** Used to build share links. */
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parsed lazily so `next build` doesn't need database credentials. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}
