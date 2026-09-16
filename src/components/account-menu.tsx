"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { LogOutIcon } from "@/components/icons";
import type { Person } from "@/domain/views";
import { logOut } from "@/lib/auth/client";

/**
 * The avatar in the header opens a small disclosure with the account name and
 * Log out. A disclosure (not an ARIA menu) keeps keyboard behaviour simple:
 * Tab moves through it, Escape closes it and returns focus to the avatar.
 */
export function AccountMenu({ account }: { account: Person }) {
  const router = useRouter();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close({ restoreFocus }: { restoreFocus: boolean }) {
    setOpen(false);
    setMessage("");
    if (restoreFocus) buttonRef.current?.focus();
  }

  async function onLogOut() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await logOut();
      if (result.ok) {
        router.replace("/login");
        router.refresh();
        return;
      }
      setMessage("That didn’t go through. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) close({ restoreFocus: true });
      }}
      onBlur={(event) => {
        // Close when focus leaves the menu entirely (e.g. tabbing past Log out).
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) close({ restoreFocus: false });
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Account: ${account.name}`}
        onClick={() => (open ? close({ restoreFocus: false }) : setOpen(true))}
        className="flex rounded-full"
      >
        <Avatar person={account} size={40} />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full right-0 z-20 mt-2 w-64 rounded-lg border-[2.5px] border-cocoa bg-card p-2"
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar person={account} size={34} />
          <p className="min-w-0 truncate font-extrabold text-cocoa">{account.name}</p>
        </div>
        <div className="my-1 border-t-2 border-dashed border-cream-deep" />
        <button
          type="button"
          onClick={onLogOut}
          aria-disabled={pending || undefined}
          className="flex min-h-11 w-full items-center gap-2 rounded-full px-3 font-display text-sm font-bold text-cocoa hover:bg-cream-deep aria-disabled:cursor-progress"
        >
          <LogOutIcon size={16} />
          {pending ? "Logging out…" : "Log out"}
        </button>
        <p role="status" className={message ? "px-3 pt-1 pb-2 text-sm text-cocoa-soft" : "sr-only"}>
          {message}
        </p>
      </div>
    </div>
  );
}
