import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Env } from "@/lib/env";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type Connection = {
  db: Db;
  driver: "postgres" | "pglite";
  close: () => Promise<void>;
};

/** Hosted Postgres when DATABASE_URL is set; otherwise a local PGlite database (dev and tests only). */
export function connect({ DATABASE_URL, PGLITE_DATA_DIR }: Pick<Env, "DATABASE_URL" | "PGLITE_DATA_DIR">): Connection {
  if (DATABASE_URL) {
    // Neon's pooled connection string runs through PgBouncer, which doesn't
    // support prepared statements.
    const client = postgres(DATABASE_URL, { prepare: false });
    return {
      db: drizzlePostgres(client, { schema }) as unknown as Db,
      driver: "postgres",
      close: () => client.end(),
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }

  // An empty data dir means in-memory, which is what the tests use.
  const client = PGLITE_DATA_DIR ? new PGlite(PGLITE_DATA_DIR) : new PGlite();
  return {
    db: drizzlePglite(client, { schema }) as unknown as Db,
    driver: "pglite",
    close: () => client.close(),
  };
}
