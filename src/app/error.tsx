"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/status/status-page";

/**
 * Something failed while rendering a page. Plain words and a retry, never a
 * stack trace (anyone can land here, including guests).
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      {/* Error boundaries can't export metadata; React hoists this into <head>. */}
      <title>Something went wrong · Tiebreak</title>
      <StatusPage
      eyebrow="Something went wrong"
      title="That didn’t load"
      before={
        <button
          type="button"
          onClick={reset}
          className="press inline-flex min-h-12 items-center justify-center rounded-full border-2 border-cocoa bg-cocoa px-6 font-display font-bold text-cream shadow-press-cocoa"
        >
          Try again
        </button>
      }
      actions={[{ label: "Go to my polls", href: "/" }]}
    >
      <p>Something went wrong on our side, not yours. Your votes and polls are safe.</p>
      {error.digest && <p className="text-sm">If it keeps happening, mention this code: {error.digest}</p>}
      </StatusPage>
    </>
  );
}
