"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type SheetDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * A modal built on the native <dialog>: showModal() makes the rest of the
 * page inert (focus stays inside), Escape closes it, and the browser returns
 * focus to whatever opened it. Sits at the bottom on phones, centred above.
 */
export function SheetDialog({ open, title, onClose, children }: SheetDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      // Escape fires "cancel"; route it through React state so both stay in sync.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> itself.
        if (event.target === event.currentTarget) onClose();
      }}
      className="sheet m-0 mt-auto w-full max-w-none rounded-t-lg border-[2.5px] border-b-0 border-cocoa bg-card p-0 text-cocoa sm:m-auto sm:max-w-form sm:rounded-lg sm:border-b-[2.5px]"
    >
      <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7">
        <h2 id={titleId} className="font-display text-xl font-extrabold text-balance">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
