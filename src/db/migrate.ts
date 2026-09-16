import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import type { Connection } from "./connect";

export const MIGRATIONS_FOLDER = "drizzle";

export async function runMigrations({ db, driver }: Connection) {
  // Both migrators read the same SQL files; they only differ in the session type they accept.
  const migrate = (driver === "pglite" ? migratePglite : migratePostgres) as (
    db: Connection["db"],
    config: { migrationsFolder: string },
  ) => Promise<void>;
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
