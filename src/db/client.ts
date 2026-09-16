import "server-only";

import { env } from "@/lib/env";
import { connect, type Db } from "./connect";

export type { Db };

// Survives hot reloads in dev, so we don't open a new connection (or a second
// PGlite instance on the same data directory) on every edit.
const globalForDb = globalThis as unknown as { tiebreakDb?: Db };

export function getDb(): Db {
  globalForDb.tiebreakDb ??= connect(env()).db;
  return globalForDb.tiebreakDb;
}
