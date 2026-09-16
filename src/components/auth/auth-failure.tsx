import Link from "next/link";
import type { AuthErrorCode } from "@/lib/auth/client";

/** Plain-language copy for a failed log in or sign up. */
export function AuthFailure({ code, logInHref }: { code: AuthErrorCode; logInHref: string }) {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return <>That email and password don&rsquo;t match. Check them and try again.</>;
    case "EMAIL_TAKEN":
      return (
        <>
          There&rsquo;s already an account with that email.{" "}
          <Link href={logInHref} className="font-bold underline underline-offset-2">
            Log in instead
          </Link>
          .
        </>
      );
    case "NETWORK":
      return <>That didn&rsquo;t send. Check your connection and try again.</>;
    case "UNAVAILABLE":
      return <>Accounts aren&rsquo;t switched on yet, so this can&rsquo;t sign you in. Try again soon.</>;
  }
}
