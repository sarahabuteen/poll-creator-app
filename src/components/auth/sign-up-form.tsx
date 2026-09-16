"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFailure } from "@/components/auth/auth-failure";
import { SubmitButton } from "@/components/auth/submit-button";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordField } from "@/components/forms/password-field";
import { TextField } from "@/components/forms/text-field";
import { signUp } from "@/lib/auth/client";
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, validateSignUp } from "@/lib/auth/validation";

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const form = useAuthForm({
    initial: { name: "", email: "", password: "" },
    fields: ["name", "email", "password"],
    validate: validateSignUp,
    submit: signUp,
    onSuccess: () => {
      router.replace(next);
      // Server components re-read the session cookie on the next render.
      router.refresh();
    },
  });
  const logInHref = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-5">
      {form.failure && (
        <FormAlert>
          <AuthFailure code={form.failure} logInHref={logInHref} />
        </FormAlert>
      )}

      <TextField
        {...form.field("name")}
        label="Your name"
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        required
      />
      <TextField {...form.field("email")} label="Email" type="email" autoComplete="email" inputMode="email" required />
      <PasswordField
        {...form.field("password")}
        label="Password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        autoComplete="new-password"
        required
      />

      <SubmitButton pending={form.pending} pendingLabel="Creating your account…">
        Create account
      </SubmitButton>

      <p className="text-sm text-cocoa-soft">
        Already have an account?{" "}
        <Link href={logInHref} className="font-bold text-cocoa underline underline-offset-2">
          Log in
        </Link>
      </p>
    </form>
  );
}
