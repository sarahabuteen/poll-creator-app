import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

const get = (path: string, cookie?: string) =>
  proxy(new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} }));

describe("proxy", () => {
  it("sends signed-out visitors on creator pages to log in, remembering where they were", () => {
    const response = get("/polls/pizza-night?tab=moderation");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fpolls%2Fpizza-night%3Ftab%3Dmoderation",
    );
  });

  it("lets a request with a session cookie through (pages still verify it)", () => {
    expect(get("/polls/pizza-night", "tiebreak.session_token=abc").headers.get("location")).toBeNull();
  });

  it("never runs on vote links, auth pages or the API", () => {
    const matchers = config.matcher.map((pattern) => new RegExp(`^${pattern.replace("/:path*", "(/.*)?")}$`));
    for (const path of ["/p/pizza-night", "/login", "/signup", "/api/polls/pizza-night"]) {
      expect(matchers.some((matcher) => matcher.test(path)), path).toBe(false);
    }
    expect(matchers.some((matcher) => matcher.test("/polls/pizza-night"))).toBe(true);
  });
});
