import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Only the API layer talks to the database. Pages, components and client
    // code get data through the HTTP API (see src/app/api and src/lib/api).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/api/**", "src/server/**", "src/db/**", "src/test/**", "**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db/*", "!@/db/sample-types", "@/server/*", "drizzle-orm", "drizzle-orm/*", "postgres", "@electric-sql/pglite"],
              message: "Read and write data through the API (src/app/api) instead of the database layer.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
