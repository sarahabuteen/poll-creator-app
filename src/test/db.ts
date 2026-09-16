import { eq } from "drizzle-orm";
import postgres from "postgres";
import { connect, type Connection } from "@/db/connect";
import { runMigrations } from "@/db/migrate";
import { options, polls } from "@/db/schema";
import { seedSampleData } from "@/db/seed";

/** A fixed "now" for tests; sample data is shifted so polls sit at the same distance from it. */
export const NOW = new Date("2030-01-01T12:00:00Z");
export const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

/**
 * A fresh database with migrations applied.
 *
 * By default an in-memory PGlite. With TEST_DATABASE_URL set (a Postgres server
 * you don't mind tests writing to, e.g. a local Docker container), each test
 * file gets its own throwaway database on that server, reached through the
 * same postgres-js driver production uses, so driver-specific bugs surface.
 */
export async function createTestDb(): Promise<Connection> {
  const serverUrl = process.env.TEST_DATABASE_URL;
  if (!serverUrl) {
    const connection = connect({ DATABASE_URL: undefined, PGLITE_DATA_DIR: "" });
    await runMigrations(connection);
    return connection;
  }

  const name = `tiebreak_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = postgres(serverUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(`create database "${name}"`);

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const connection = connect({ DATABASE_URL: url.toString(), PGLITE_DATA_DIR: "" });
  await runMigrations(connection);

  return {
    ...connection,
    close: async () => {
      await connection.close();
      await admin.unsafe(`drop database if exists "${name}" with (force)`);
      await admin.end();
    },
  };
}

export async function reseed(connection: Connection) {
  await seedSampleData(connection.db, { now: NOW.getTime() });
}

/** Option ids by label for a seeded poll. */
export async function optionIds(connection: Connection, slug: string): Promise<Record<string, string>> {
  const rows = await connection.db
    .select({ id: options.id, label: options.label })
    .from(options)
    .innerJoin(polls, eq(options.pollId, polls.id))
    .where(eq(polls.slug, slug));
  return Object.fromEntries(rows.map((row) => [row.label, row.id]));
}

export function voter(name: string) {
  return {
    ballotId: crypto.randomUUID(),
    voterToken: `test-token-${name.toLowerCase()}-${crypto.randomUUID()}`,
    voter: { name, avatar: { seed: name, tint: "cbe2d8" as const } },
  };
}
