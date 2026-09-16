import Link from "next/link";

/** Always visible in guest mode, so nobody mistakes the sample for their own polls. */
export function GuestBanner() {
  return (
    <div className="border-b-2 border-cocoa bg-butter px-4 py-2.5 text-center text-sm text-cocoa">
      <strong className="font-extrabold">Guest mode.</strong> Try anything: nothing here is saved, and a reload starts fresh.{" "}
      <Link href="/signup" className="font-bold whitespace-nowrap underline underline-offset-2">
        Sign up to run your own polls
      </Link>
    </div>
  );
}
