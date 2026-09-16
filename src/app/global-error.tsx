"use client";

import "./globals.css";

/** Last resort, when the root layout itself fails: no fonts or providers, just plain words and a way back. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-full bg-cream text-cocoa">
        <main className="mx-auto max-w-form px-4 py-16">
          <h1 className="font-display text-2xl font-extrabold">Tiebreak didn&rsquo;t load</h1>
          <p className="mt-4 text-cocoa-soft">Something went wrong on our side. Your votes and polls are safe.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 min-h-12 rounded-full border-2 border-cocoa bg-cocoa px-6 font-bold text-cream"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
