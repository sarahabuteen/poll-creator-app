"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFailure } from "@/components/auth/auth-failure";
import { SubmitButton } from "@/components/auth/submit-button";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordField } from "@/components/forms/password-field";
import { TextField } from "@/components/forms/text-field";
import { logIn } from "@/lib/auth/client";
import { validateLogIn } from "@/lib/auth/validation";

export function LogInForm({ next }: { next: string }) {
  const router = useRouter();
  const form = useAuthForm({
    initial: { email: "", password: "" },
    fields: ["email", "password"],
    validate: validateLogIn,
    submit: logIn,
    onSuccess: () => router.replace(next),
  });
  const signUpHref = next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-5">
      {form.failure && (
        <FormAlert>
          <AuthFailure code={form.failure} logInHref="/login" />
        </FormAlert>
      )}

      <TextField {...form.field("email")} label="Email" type="email" autoComplete="email" inputMode="email" required />
      <PasswordField {...form.field("password")} label="Password" autoComplete="current-password" required />

      <SubmitButton pending={form.pending} pendingLabel="Logging in…">
        Log in
      </SubmitButton>

      <p className="text-sm text-cocoa-soft">
        New to Tiebreak?{" "}
        <Link href={signUpHref} className="font-bold text-cocoa underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}
