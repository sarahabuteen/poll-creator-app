import { describe, expect, it } from "vitest";
import { resolveAppUrl } from "./env";

describe("resolveAppUrl", () => {
  it("uses NEXT_PUBLIC_APP_URL when it's set", () => {
    expect(resolveAppUrl({ NEXT_PUBLIC_APP_URL: "https://tiebreak.example/", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe(
      "https://tiebreak.example",
    );
  });

  it("never falls back to localhost on a Vercel production deployment", () => {
    expect(resolveAppUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "poll-creator-app.vercel.app", VERCEL_URL: "poll-creator-app-abc123.vercel.app" })).toBe(
      "https://poll-creator-app.vercel.app",
    );
  });

  it("uses the deployment's own URL on previews", () => {
    expect(resolveAppUrl({ VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "poll-creator-app.vercel.app", VERCEL_URL: "poll-creator-app-abc123.vercel.app" })).toBe(
      "https://poll-creator-app-abc123.vercel.app",
    );
  });

  it("defaults to localhost for local development", () => {
    expect(resolveAppUrl({})).toBe("http://localhost:3000");
  });
});
