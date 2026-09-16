import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const next = safeNextPath((await searchParams).next);

  return (
    <AuthShell
      title="Start settling things"
      intro="Only the organiser needs an account. Your crew votes with just a name and a face."
    >
      <SignUpForm next={next} />
    </AuthShell>
  );
}
