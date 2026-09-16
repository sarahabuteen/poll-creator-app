import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * End-to-end tests in a real browser against a throwaway local database
 * (PGlite in .pglite-playwright), freshly migrated and seeded for every run.
 * Never touches the hosted database.
 */
export default defineConfig({
  testDir: "e2e",
  // Tests share one seeded database and mutate it, so they run in order.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    // Use the locally installed Chrome where available; CI installs Playwright's Chromium.
    ...(process.env.CI ? {} : { channel: "chrome" }),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /reflow|vote/ },
    // Dark mode meets the same AA bar: the full axe sweep again, on the dark palette.
    { name: "desktop-dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" }, testMatch: /accessibility|theme|status-pages/ },
  ],
  webServer: {
    command: `rm -rf .pglite-playwright && npm run db:setup && npx next dev --port ${PORT}`,
    url: `${BASE_URL}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      // An empty DATABASE_URL overrides .env.local, so the local PGlite database is used.
      DATABASE_URL: "",
      PGLITE_DATA_DIR: ".pglite-playwright",
      SAMPLE_CREATOR_PASSWORD: "playwright-sample-password",
      NEXT_PUBLIC_APP_URL: BASE_URL,
    },
  },
});
