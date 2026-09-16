"use client";

import Link from "next/link";
import { useOptionalGuest } from "@/components/guest/guest-provider";

/** Always visible in guest mode, so nobody mistakes the sample for their own polls. */
export function GuestBanner() {
  const guest = useOptionalGuest();
  return (
    <aside aria-label="Guest mode" className="border-b-2 border-cocoa bg-butter px-4 py-2.5 text-center text-sm text-ink">
      <strong className="font-extrabold">Guest mode.</strong> Try anything: it&rsquo;s saved only in this browser, never on our servers.{" "}
      {guest && (
        <>
          <button type="button" onClick={guest.startOver} className="font-bold underline underline-offset-2">
            Start over
          </button>{" "}
          &middot;{" "}
        </>
      )}
      <Link href="/signup" className="font-bold underline underline-offset-2">
        Sign up to run your own polls
      </Link>
    </aside>
  );
}
