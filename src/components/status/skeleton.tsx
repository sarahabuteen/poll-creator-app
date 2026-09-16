import type { ReactNode } from "react";

/** A placeholder block. Pulses only for viewers who allow motion. */
export function Bone({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded-md bg-cream-deep motion-safe:animate-pulse ${className}`} style={style} />;
}

/** A skeleton card with the brand's ink outline, so the page keeps its shape while loading. */
export function BoneCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border-[2.5px] border-cocoa-faint bg-card p-5 sm:p-7 ${className}`}>{children}</div>;
}

/**
 * Wraps a loading placeholder: hidden from assistive tech as decoration, with
 * one polite "Loading" message instead. Sized like the real page so nothing
 * jumps when the data lands.
 */
export function PageSkeleton({ label, children, width = "content" }: { label: string; children: ReactNode; width?: "content" | "form" }) {
  return (
    <>
      <div className="mx-auto flex min-h-(--nav-height) w-full max-w-page items-center gap-4 px-4 sm:px-6" aria-hidden="true">
        <Bone className="h-8 w-32 rounded-full" />
        <Bone className="ml-auto size-11 rounded-full" />
      </div>
      <main id="main" aria-busy="true" className={`mx-auto w-full ${width === "form" ? "max-w-form" : "max-w-content"} px-4 pt-6 pb-28 sm:px-6 sm:pt-8`}>
        <p role="status" className="sr-only">
          {label}
        </p>
        <div aria-hidden="true">{children}</div>
      </main>
    </>
  );
}
