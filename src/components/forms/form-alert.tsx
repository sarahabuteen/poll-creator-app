import type { ReactNode } from "react";
import { WarningIcon } from "@/components/icons";

/**
 * A whole-form failure ("That didn't send"). Cocoa on cream-deep with an icon:
 * errors never borrow tangerine or butter, which mean winning.
 */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md bg-cream-deep px-4 py-3 text-sm text-cocoa"
    >
      <WarningIcon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
