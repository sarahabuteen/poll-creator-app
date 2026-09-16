"use client";

import type { Ref } from "react";
import { Avatar } from "@/components/avatar";
import { CheckIcon, WarningIcon } from "@/components/icons";
import type { BallotOptionView } from "@/domain/views";

type BallotProps = {
  options: BallotOptionView[];
  voteType: "single" | "multi";
  maxChoices: number;
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  error?: string;
  firstInputRef: Ref<HTMLInputElement>;
};

/**
 * The ballot: a real fieldset of radios (or checkboxes for pick-up-to-N),
 * starting with nothing selected. The chosen state is unmistakable: fill,
 * ring and check, not a subtle border shift.
 */
export function Ballot({ options, voteType, maxChoices, selected, onChange, error, firstInputRef }: BallotProps) {
  const multi = voteType === "multi";
  const full = multi && selected.length >= maxChoices;
  const hintId = "ballot-hint";
  const errorId = "ballot-error";

  function toggle(id: string) {
    if (!multi) return onChange([id]);
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return (
    <fieldset aria-describedby={[hintId, error ? errorId : ""].filter(Boolean).join(" ")}>
      <legend className="font-display text-lg font-extrabold">{multi ? `Pick up to ${maxChoices}` : "Pick one"}</legend>
      <p id={hintId} className="mt-1 text-sm text-cocoa-soft">
        {multi ? `${selected.length} of ${maxChoices} picked. ` : ""}Votes are final, so pick what you mean.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {options.map((option, index) => {
          const checked = selected.includes(option.id);
          const blocked = full && !checked;
          return (
            <label
              key={option.id}
              className={`group relative flex min-h-16 items-center gap-4 rounded-lg border-[2.5px] px-4 py-3 transition-colors motion-safe:animate-rise ${
                checked ? "border-teal-deep bg-teal-soft" : "border-cocoa bg-card"
              } ${blocked ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-cream-deep"} ${
                checked ? "hover:bg-teal-soft" : ""
              } has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal`}
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <input
                ref={index === 0 ? firstInputRef : undefined}
                type={multi ? "checkbox" : "radio"}
                name="ballot"
                value={option.id}
                checked={checked}
                disabled={blocked}
                onChange={() => toggle(option.id)}
                aria-invalid={error ? true : undefined}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex size-7 shrink-0 items-center justify-center border-[2.5px] ${multi ? "rounded-sm" : "rounded-full"} ${
                  checked ? "border-teal-deep bg-teal text-cream" : "border-cocoa bg-cream"
                }`}
              >
                {checked && <CheckIcon size={16} className="motion-safe:animate-check" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-md font-extrabold text-cocoa">{option.label}</span>
                {option.suggestedBy && (
                  <span className="mt-1 flex items-center gap-1.5 text-sm text-cocoa-soft">
                    <Avatar person={option.suggestedBy} size={20} />
                    {/* Its own box, so at large text sizes on a narrow phone the words can wrap instead of pushing the page wide. */}
                    <span className="min-w-0 [overflow-wrap:anywhere]">Suggested by {option.suggestedBy.name}</span>
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p id={errorId} className="mt-3 flex items-start gap-1.5 text-sm font-bold text-cocoa">
          <WarningIcon size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
