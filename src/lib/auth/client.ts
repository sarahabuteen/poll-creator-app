import type { LogInValues, SignUpValues } from "./validation";

/**
 * The auth calls the UI makes. These are placeholders until the Better Auth
 * backend lands (scope 2, backend): they resolve with an honest "not
 * available" result so every form state can be built and tested now, and the
 * components won't change when the real client replaces them.
 */

export type AuthErrorCode = "INVALID_CREDENTIALS" | "EMAIL_TAKEN" | "NETWORK" | "UNAVAILABLE";

export type AuthResult = { ok: true } | { ok: false; code: AuthErrorCode };

const notConnected = async (): Promise<AuthResult> => {
  // A short pause so the pending state is visible, as it will be with a real request.
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: false, code: "UNAVAILABLE" };
};

export function logIn(values: LogInValues): Promise<AuthResult> {
  void values;
  return notConnected();
}

export function signUp(values: SignUpValues): Promise<AuthResult> {
  void values;
  return notConnected();
}

export function logOut(): Promise<AuthResult> {
  return notConnected();
}
