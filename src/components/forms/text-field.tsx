import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { WarningIcon } from "@/components/icons";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "aria-describedby" | "aria-invalid"> & {
  id: string;
  label: string;
  /** Guidance shown before any error, e.g. password rules. */
  hint?: string;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** A control that sits inside the field on the right, like a show-password toggle. */
  trailing?: ReactNode;
};

/** A labelled input with its hint and error wired up for assistive tech. */
export function TextField({ id, label, hint, error, inputRef, trailing, className = "", ...input }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-cocoa">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-cocoa-soft">
          {hint}
        </p>
      )}
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-12 w-full rounded-md bg-card px-4 text-base text-cocoa placeholder:text-cocoa-soft ${
            error ? "border-[2.5px] border-cocoa" : "border-2 border-cocoa"
          } ${trailing ? "pr-14" : ""} ${className}`}
          {...input}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-bold text-cocoa">
          <WarningIcon size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
