import Link from "next/link";
import { PlusIcon } from "@/components/icons";

const STEPS = [
  { title: "Make it", body: "A question, a few options and a closing time. Under a minute." },
  { title: "Drop the link in the chat", body: "Your crew votes with a name and a face. No accounts for them." },
  { title: "Watch it settle", body: "Votes land live, and the result lands when voting closes." },
];

/**
 * A brand-new creator's dashboard. Everything points at the first shared link;
 * the empty poll card shows the shape of what's coming without faking numbers.
 */
export function FirstRun({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-10">
      <div className="motion-safe:animate-rise">
        <p className="font-display text-md font-bold text-cocoa-soft">Hi, {name}</p>
        <h1 className="riso mt-2 font-display text-[clamp(2rem,1.4rem+3.2vw,var(--text-2xl))] leading-(--leading-display) font-extrabold tracking-[-0.02em] text-balance">
          Settle your first group decision
        </h1>
        <p className="mt-3 max-w-prose text-md text-cocoa-soft">
          Make a poll, drop the link in the group chat, and let the crew decide.
        </p>
        {/* The one place a filled tangerine New poll is earned. */}
        <Link
          href="/polls/new"
          className="press mt-6 inline-flex min-h-14 items-center gap-2 rounded-full border-2 border-cocoa bg-tangerine-deep px-7 font-display text-base font-bold text-cream-bright shadow-press-tangerine"
        >
          <PlusIcon size={18} />
          New poll
        </Link>
      </div>

      <ol role="list" className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-lg border-[2.5px] border-cocoa bg-card p-5 motion-safe:animate-rise"
            style={{ animationDelay: `${120 + index * 90}ms` }}
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full border-2 border-cocoa bg-teal-soft font-display font-extrabold text-teal-deep"
            >
              {index + 1}
            </span>
            <h2 className="mt-3 font-display text-md font-extrabold">
              <span className="sr-only">Step {index + 1}: </span>
              {step.title}
            </h2>
            <p className="mt-1 text-sm text-cocoa-soft">{step.body}</p>
          </li>
        ))}
      </ol>

      {/* Decorative: the outline of a poll, with nothing made up inside it. */}
      <div aria-hidden="true" className="rounded-lg border-[2.5px] border-dashed border-cocoa-faint p-6 motion-safe:animate-rise" style={{ animationDelay: "420ms" }}>
        <div className="h-5 w-24 rounded-full bg-cream-deep" />
        <div className="mt-4 h-8 w-3/4 rounded-md bg-cream-deep" />
        <div className="mt-6 flex flex-col gap-3">
          {[80, 55, 30].map((width) => (
            <div key={width} className="flex items-center gap-4">
              <div className="h-4 w-1/3 rounded-full bg-cream-deep" />
              <div className="h-3 flex-1 rounded-full bg-cream-deep">
                <div className="h-3 rounded-full bg-cocoa-faint/30" style={{ width: `${width}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
