import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

export type StatusAction = { label: string; href: string; primary?: boolean };

type StatusPageProps = {
  /** A short label above the title, e.g. "404". */
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions?: StatusAction[];
  /** Extra controls (e.g. a Try again button) placed before the links. */
  before?: ReactNode;
  /** Pages inside a layout that already has a header and <main> (guest mode) skip their own. */
  bare?: boolean;
};

/**
 * The frame for "this isn't here" and "that didn't work". Never a dead end:
 * every status page offers somewhere to go. Plain cocoa and teal, never
 * tangerine or butter, which mean winning.
 */
export function StatusPage({ eyebrow, title, children, actions = [], before, bare = false }: StatusPageProps) {
  const content = (
    <div className="mx-auto w-full max-w-form px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
      {/* Decorative: an empty tally, nothing counted. */}
      <div aria-hidden="true" className="flex gap-1.5">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="h-4 w-8 rounded-sm border-2 border-dashed border-cocoa-faint" />
        ))}
      </div>
      <p className="mt-6 font-display text-sm font-extrabold tracking-[0.06em] text-cocoa-soft uppercase">{eyebrow}</p>
      <h1 className="riso mt-2 font-display text-[clamp(2rem,1.5rem+2.4vw,2.75rem)] leading-(--leading-display) font-extrabold tracking-[-0.02em] text-balance">
        {title}
      </h1>
      <div className="mt-4 flex flex-col gap-3 text-md text-cocoa-soft">{children}</div>
      {(before || actions.length > 0) && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {before}
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                action.primary
                  ? "press inline-flex min-h-12 items-center justify-center rounded-full border-2 border-cocoa bg-cocoa px-6 font-display font-bold text-cream shadow-press-cocoa"
                  : "press inline-flex min-h-12 items-center justify-center rounded-full border-2 border-cocoa bg-card px-6 font-display font-bold hover:bg-cream-deep"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  if (bare) return content;

  return (
    <>
      {/* Not a link home: "/" needs an account, and many visitors here are voters. */}
      <header className="mx-auto flex min-h-16 w-full max-w-page flex-wrap items-center gap-2 px-4 font-display text-xl font-extrabold tracking-[-0.02em] sm:px-6">
        <LogoMark size={24} />
        tiebreak
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </header>
      <main id="main" className="flex-1">
        {content}
      </main>
    </>
  );
}
