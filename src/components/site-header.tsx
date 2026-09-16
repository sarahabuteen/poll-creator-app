import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { LogoMark, PlusIcon } from "@/components/icons";
import type { Person } from "@/domain/views";

type SiteHeaderProps = {
  /** The signed-in creator, or null in guest mode. */
  account: Person | null;
  current: "my-polls" | "closed" | null;
  /** Hidden on the empty dashboard, where the page's own tangerine button is the one way in. */
  showNewPoll?: boolean;
};

export function SiteHeader({ account, current, showNewPoll = true }: SiteHeaderProps) {
  const guest = account === null;
  const home = guest ? "/guest" : "/";
  // Guests get the real screens with sample data; making a poll needs an account.
  const newPollHref = guest ? "/signup?next=%2Fpolls%2Fnew" : "/polls/new";
  const navItems = [
    { key: "my-polls", label: "My polls", href: home },
    { key: "closed", label: "Closed", href: guest ? "/guest/closed" : "/closed" },
  ] as const;

  return (
    <header className="mx-auto w-full max-w-page px-4 sm:px-6">
      {/*
        Once there's room for the logo and actions beside it, the nav sits in a
        middle column the width of the poll column below, so the two align.
        47rem = --content-max-width minus the main column's side padding.
      */}
      <div className="flex min-h-(--nav-height) flex-wrap items-center gap-x-8 gap-y-2 py-3 min-[72rem]:grid min-[72rem]:grid-cols-[1fr_47rem_1fr] min-[72rem]:gap-x-0">
        <Link href={home} className="flex items-center justify-self-start gap-2 rounded-full font-display text-[1.625rem] font-extrabold tracking-[-0.02em] text-cocoa">
          <LogoMark />
          tiebreak
        </Link>

        <nav aria-label="Main" className="order-last w-full sm:order-none sm:w-auto">
          <ul role="list" className="flex flex-wrap gap-1">
            {navItems.map((item) => {
              const active = item.key === current;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold ${
                      active ? "bg-cream-deep text-cocoa" : "text-cocoa-soft hover:bg-cream-deep hover:text-cocoa"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-4 justify-self-end">
          {showNewPoll && (
            <>
              <Link
                href={newPollHref}
                className="press hidden min-h-11 shrink-0 items-center gap-2 rounded-full whitespace-nowrap border-2 border-cocoa bg-card px-5 font-display text-sm font-bold text-cocoa hover:bg-cream-deep sm:inline-flex"
              >
                <PlusIcon />
                New poll
              </Link>
              <Link
                href={newPollHref}
                aria-label="New poll"
                className="press inline-flex size-11 items-center justify-center rounded-full border-2 border-cocoa bg-tangerine text-cream-bright shadow-press-tangerine sm:hidden"
              >
                <PlusIcon size={20} />
              </Link>
            </>
          )}
          {account ? (
            <AccountMenu account={account} />
          ) : (
            <Link href="/login" className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 font-display text-sm font-bold whitespace-nowrap hover:bg-cream-deep">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
