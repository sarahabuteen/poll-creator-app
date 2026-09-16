import { defineConfig } from "drizzle-kit";

// Generating migrations only diffs the schema file, so no database connection is needed.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
