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
