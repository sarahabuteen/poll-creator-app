import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/icons";

type AuthShellProps = {
  title: string;
  intro: ReactNode;
  children: ReactNode;
};

/** The frame shared by log in and sign up: a quiet page with one card and one job. */
export function AuthShell({ title, intro, children }: AuthShellProps) {
  return (
    <>
      <header className="mx-auto flex min-h-(--nav-height) w-full max-w-page items-center px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full font-display text-[1.625rem] font-extrabold tracking-[-0.02em] text-cocoa"
        >
          <LogoMark />
          tiebreak
        </Link>
      </header>

      <main id="main" className="mx-auto w-full max-w-[28rem] flex-1 px-4 pt-6 pb-16 sm:pt-12">
        <h1 className="riso font-display text-[clamp(2.25rem,1.9rem+1.6vw,2.75rem)] leading-(--leading-display) font-extrabold tracking-[-0.02em] text-cocoa">
          {title}
        </h1>
        <p className="mt-3 text-md text-cocoa-soft">{intro}</p>

        <div className="mt-8 rounded-lg border-[2.5px] border-cocoa bg-card p-5 sm:p-7">{children}</div>

        <p className="mt-6 text-center text-sm text-cocoa-soft">
          Just looking?{" "}
          <Link href="/guest" className="font-bold text-cocoa underline underline-offset-2">
            Try Tiebreak as a guest
          </Link>
        </p>
        {/* Most people who land here by mistake are voters, and voters never need an account. */}
        <p className="mt-2 text-center text-sm text-cocoa-soft">
          Voting on a friend&rsquo;s poll? You don&rsquo;t need an account. Just open their link.
        </p>
      </main>
    </>
  );
}
