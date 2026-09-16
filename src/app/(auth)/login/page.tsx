import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LogInForm } from "@/components/auth/log-in-form";
import { getSignedInCreator } from "@/lib/api/session";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LogInPage({ searchParams }: PageProps<"/login">) {
  const next = safeNextPath((await searchParams).next);
  // Already signed in: skip the form. Checked through the API, so a stale cookie still sees the form.
  if (await getSignedInCreator()) redirect(next);

  return (
    <AuthShell
      title="Welcome back"
      intro="Log in to check on your polls and see what your crew has been suggesting."
    >
      <LogInForm next={next} />
    </AuthShell>
  );
}
