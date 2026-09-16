"use client";

import { useState } from "react";
import { CheckIcon, WarningIcon } from "@/components/icons";
import {
  defaultClosingPick,
  describeClosing,
  fromDateTimeLocal,
  quickClosingPicks,
  toDateTimeLocal,
} from "@/lib/create/closing";
import { useNow } from "@/lib/time";

const CUSTOM = "custom";

/** State for a closing-time choice: quick picks in the viewer's own time, or a custom date and time. */
export function useClosingTime() {
  const nowMs = useNow();
  const now = nowMs === null ? null : new Date(nowMs);
  const picks = now ? quickClosingPicks(now) : [];
  const [pick, setPick] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const selectedPick = pick ?? (picks.length ? defaultClosingPick(picks) : null);
  const closesAt =
    selectedPick === CUSTOM ? fromDateTimeLocal(custom) : (picks.find((item) => item.id === selectedPick)?.closesAt ?? null);

  return { now, picks, selectedPick, setPick, custom, setCustom, closesAt };
}

export type ClosingTime = ReturnType<typeof useClosingTime>;

/** The id to focus when the closing time is invalid. */
export function closingFocusId(closing: ClosingTime, idPrefix = "closing") {
  return closing.selectedPick === CUSTOM ? `${idPrefix}-custom-time` : `${idPrefix}-${closing.selectedPick ?? "in-1-hour"}`;
}

type ClosingTimeFieldProps = {
  closing: ClosingTime;
  error?: string;
  legend?: string;
  /** Keeps ids unique when more than one field is on a page. */
  idPrefix?: string;
  className?: string;
};

/** One-tap closing times plus "Pick a time", with the resolved time always spelled out. */
export function ClosingTimeField({ closing, error, legend = "Voting closes", idPrefix = "closing", className = "" }: ClosingTimeFieldProps) {
  const { now, picks, selectedPick, setPick, custom, setCustom, closesAt } = closing;

  return (
    <fieldset className={className} aria-describedby={error ? `${idPrefix}-error` : closesAt ? `${idPrefix}-summary` : undefined}>
      <legend className="text-sm font-bold">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {now === null
          ? // Placeholder pills hold the layout until the local time is known.
            Array.from({ length: 5 }, (_, index) => <span key={index} aria-hidden="true" className="h-11 w-28 rounded-full bg-cream-deep" />)
          : [...picks.map((item) => ({ id: item.id, label: item.label })), { id: CUSTOM, label: "Pick a time" }].map((item) => {
              const checked = selectedPick === item.id;
              return (
                <label key={item.id} className="cursor-pointer">
                  <input
                    id={`${idPrefix}-${item.id}`}
                    type="radio"
                    name={idPrefix}
                    value={item.id}
                    checked={checked}
                    onChange={() => {
                      setPick(item.id);
                      if (item.id === CUSTOM && !custom) setCustom(toDateTimeLocal(new Date(now.getTime() + 2 * 60 * 60_000)));
                    }}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal ${
                      checked ? "border-teal-deep bg-teal-soft text-teal-deep" : "border-cocoa bg-cream hover:bg-cream-deep"
                    }`}
                  >
                    {checked && <CheckIcon size={14} className="motion-safe:animate-check" />}
                    {item.label}
                  </span>
                </label>
              );
            })}
      </div>

      {selectedPick === CUSTOM && now && (
        <div className="mt-3 motion-safe:animate-rise">
          <label htmlFor={`${idPrefix}-custom-time`} className="text-sm font-bold">
            Date and time
          </label>
          <input
            id={`${idPrefix}-custom-time`}
            type="datetime-local"
            value={custom}
            min={toDateTimeLocal(new Date(now.getTime() + 5 * 60_000))}
            onChange={(event) => setCustom(event.target.value)}
            aria-invalid={error ? true : undefined}
            className={`mt-1.5 block min-h-12 rounded-md bg-cream px-4 text-base ${error ? "border-[2.5px]" : "border-2"} border-cocoa`}
          />
        </div>
      )}

      {error ? (
        <p id={`${idPrefix}-error`} className="mt-2 flex items-start gap-1.5 text-sm font-bold">
          <WarningIcon size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : (
        closesAt && (
          <p id={`${idPrefix}-summary`} className="mt-2 text-sm text-cocoa-soft">
            {describeClosing(closesAt)}
          </p>
        )
      )}
    </fieldset>
  );
}
