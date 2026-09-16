/** Client-side checks for the creator auth forms. The server re-validates everything. */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export type LogInValues = { email: string; password: string };
export type SignUpValues = { name: string; email: string; password: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(email: string): string | undefined {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(value)) return "That email doesn’t look right. Check it for typos.";
}

export function validateLogIn({ email, password }: LogInValues): FieldErrors<keyof LogInValues> {
  return {
    email: emailError(email),
    password: password ? undefined : "Enter your password.",
  };
}

export function validateSignUp({ name, email, password }: SignUpValues): FieldErrors<keyof SignUpValues> {
  const trimmedName = name.trim();
  return {
    name: !trimmedName
      ? "Add your name so your crew knows who’s asking."
      : trimmedName.length > DISPLAY_NAME_MAX_LENGTH
        ? `Keep your name to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`
        : undefined,
    email: emailError(email),
    password:
      password.length < PASSWORD_MIN_LENGTH
        ? `Use at least ${PASSWORD_MIN_LENGTH} characters.`
        : password.length > PASSWORD_MAX_LENGTH
          ? `Keep your password to ${PASSWORD_MAX_LENGTH} characters or fewer.`
          : undefined,
  };
}

/** The fields that failed, in form order, so focus can go to the first one. */
export function invalidFields<Field extends string>(errors: FieldErrors<Field>, order: readonly Field[]): Field[] {
  return order.filter((field) => Boolean(errors[field]));
}
