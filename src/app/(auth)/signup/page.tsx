import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSignedInCreator } from "@/lib/api/session";
import { safeNextPath } from "@/lib/auth/redirect";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Create an account",
  description: "Make a free Tiebreak account and settle your next group decision. Only the organiser signs up; your crew votes from the link.",
  path: "/signup",
});

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const next = safeNextPath((await searchParams).next);
  // Already signed in: skip the form. Checked through the API, so a stale cookie still sees the form.
  if (await getSignedInCreator()) redirect(next);

  return (
    <AuthShell
      title="Start settling things"
      intro="Only the organiser needs an account. Your crew votes with just a name and a face."
    >
      <SignUpForm next={next} />
    </AuthShell>
  );
}
