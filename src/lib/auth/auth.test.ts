import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";
import { invalidFields, validateLogIn, validateSignUp } from "./validation";

describe("validateLogIn", () => {
  it("asks for both fields", () => {
    expect(validateLogIn({ email: "", password: "" })).toEqual({
      email: "Enter your email address.",
      password: "Enter your password.",
    });
  });

  it("checks the email shape but not the password length (that's the server's call)", () => {
    expect(validateLogIn({ email: "morgan@", password: "x" }).email).toMatch(/doesn’t look right/);
    expect(validateLogIn({ email: " morgan@example.com ", password: "x" })).toEqual({ email: undefined, password: undefined });
  });
});

describe("validateSignUp", () => {
  it("requires a name, a valid email and an 8+ character password", () => {
    const errors = validateSignUp({ name: "  ", email: "nope", password: "short" });
    expect(invalidFields(errors, ["name", "email", "password"])).toEqual(["name", "email", "password"]);
    expect(errors.password).toBe("Use at least 8 characters.");
  });

  it("accepts a valid account", () => {
    const errors = validateSignUp({ name: "Morgan", email: "morgan@example.com", password: "correct horse" });
    expect(invalidFields(errors, ["name", "email", "password"])).toEqual([]);
  });

  it("caps name and password length", () => {
    const errors = validateSignUp({ name: "M".repeat(41), email: "m@example.com", password: "p".repeat(129) });
    expect(invalidFields(errors, ["name", "email", "password"])).toEqual(["name", "password"]);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths with their query", () => {
    expect(safeNextPath("/polls/pizza-night?tab=moderation")).toBe("/polls/pizza-night?tab=moderation");
  });

  it.each([undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "polls"])(
    "falls back for %s",
    (next) => {
      expect(safeNextPath(next)).toBe("/");
    },
  );

  it("uses the first value when repeated", () => {
    expect(safeNextPath(["/a", "/b"])).toBe("/a");
  });
});

describe("toAuthErrorCode", () => {
  it("maps Better Auth errors to the codes the forms have copy for", async () => {
    const { toAuthErrorCode } = await import("./client");
    expect(toAuthErrorCode({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" })).toBe("INVALID_CREDENTIALS");
    expect(toAuthErrorCode({ status: 422, code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" })).toBe("EMAIL_TAKEN");
    expect(toAuthErrorCode({ status: 429 })).toBe("RATE_LIMITED");
    expect(toAuthErrorCode({ status: 0 })).toBe("NETWORK");
    expect(toAuthErrorCode({ status: 500, code: "SOMETHING" })).toBe("UNKNOWN");
  });
});

describe("failureCopy", () => {
  it("blames the connection only for network failures", async () => {
    const { failureCopy } = await import("@/lib/api/client");
    expect(failureCopy({ error: { code: "NETWORK" } })).toBe("That didn’t send. Check your connection and try again.");
    expect(failureCopy({ error: { code: "INTERNAL" } })).toBe("That didn’t send: something went wrong on our side. Try again in a moment.");
    expect(failureCopy({ error: { code: "INTERNAL" } }, "Voting didn’t end")).toMatch(/^Voting didn’t end: /);
  });
});
