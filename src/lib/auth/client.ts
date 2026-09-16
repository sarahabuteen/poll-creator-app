import { createAuthClient } from "better-auth/client";
import type { LogInValues, SignUpValues } from "./validation";

/**
 * The auth calls the UI makes, over Better Auth's HTTP API (/api/auth/*).
 * Results are reduced to a few codes the forms have copy for, so components
 * don't depend on the auth library's error format.
 */

export type AuthErrorCode = "INVALID_CREDENTIALS" | "EMAIL_TAKEN" | "RATE_LIMITED" | "NETWORK" | "UNKNOWN";

export type AuthResult = { ok: true } | { ok: false; code: AuthErrorCode };

// Same origin: the browser's own URL is the base, so preview deployments work unchanged.
const client = createAuthClient();

type ClientError = { status?: number; code?: string } | null;

export function toAuthErrorCode(error: ClientError): AuthErrorCode {
  if (!error) return "UNKNOWN";
  if (error.status === 429) return "RATE_LIMITED";
  if (error.code === "INVALID_EMAIL_OR_PASSWORD") return "INVALID_CREDENTIALS";
  if (error.code?.startsWith("USER_ALREADY_EXISTS")) return "EMAIL_TAKEN";
  // Better Auth reports a failed fetch with status 0.
  if (!error.status) return "NETWORK";
  return "UNKNOWN";
}

async function run(request: () => Promise<{ error: ClientError }>): Promise<AuthResult> {
  try {
    const { error } = await request();
    return error ? { ok: false, code: toAuthErrorCode(error) } : { ok: true };
  } catch {
    return { ok: false, code: "NETWORK" };
  }
}

export function logIn({ email, password }: LogInValues): Promise<AuthResult> {
  return run(() => client.signIn.email({ email: email.trim(), password }));
}

export function signUp({ name, email, password }: SignUpValues): Promise<AuthResult> {
  return run(() => client.signUp.email({ name: name.trim(), email: email.trim(), password }));
}

export function logOut(): Promise<AuthResult> {
  return run(() => client.signOut());
}
