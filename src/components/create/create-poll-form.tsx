"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { closingFocusId, ClosingTimeField, useClosingTime } from "@/components/create/closing-time-field";
import { FormAlert } from "@/components/forms/form-alert";
import { TextField } from "@/components/forms/text-field";
import { CheckIcon, PlusIcon, WarningIcon } from "@/components/icons";
import { LIMITS } from "@/domain/limits";
import { createPoll, failureCopy, loginUrlForCurrentPage } from "@/lib/api/client";
import { filledOptions, hasErrors, validateCreatePoll, type CreatePollErrors } from "@/lib/create/validation";

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Deliberately small: a poll should take under a minute to make. */
export function CreatePollForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [voteType, setVoteType] = useState<"single" | "multi">("single");
  const [maxChoices, setMaxChoices] = useState(2);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [errors, setErrors] = useState<CreatePollErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const focusOption = useRef<number | null>(null);

  // Closing picks depend on the creator's clock and timezone, so they only exist in the browser.
  const closing = useClosingTime();
  const { now, closesAt } = closing;
  const filledCount = filledOptions(options).length;

  useEffect(() => {
    if (focusOption.current === null) return;
    document.getElementById(`option-${focusOption.current}`)?.focus();
    focusOption.current = null;
  });

  function values(overrides: Partial<{ title: string; options: string[]; voteType: "single" | "multi"; maxChoices: number }> = {}) {
    return { title, options, voteType, maxChoices, suggestionsEnabled, closesAt, ...overrides };
  }

  function revalidate(overrides: Parameters<typeof values>[0]) {
    if (attempted && now) setErrors(validateCreatePoll(values(overrides), now));
  }

  function setOption(index: number, value: string) {
    const next = options.map((option, i) => (i === index ? value : option));
    setOptions(next);
    revalidate({ options: next });
  }

  function addOption() {
    if (options.length >= LIMITS.maxOptions) return;
    focusOption.current = options.length;
    setOptions([...options, ""]);
  }

  function removeOption(index: number) {
    const next = options.filter((_, i) => i !== index);
    focusOption.current = Math.max(0, index - 1);
    setOptions(next);
    revalidate({ options: next });
  }

  function focusFirstError(found: CreatePollErrors) {
    const firstEmpty = options.findIndex((option) => !option.trim());
    const firstRow = found.optionRows ? Number(Object.keys(found.optionRows)[0]) : null;
    const target = found.title
      ? "poll-title"
      : firstRow !== null
        ? `option-${firstRow}`
        : found.options
          ? `option-${firstEmpty === -1 ? 0 : firstEmpty}`
          : found.maxChoices
            ? "max-choices"
            : found.closesAt
              ? closingFocusId(closing)
              : null;
    if (target) document.getElementById(target)?.focus();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !now) return;
    setAttempted(true);
    setFailure(null);

    const found = validateCreatePoll(values(), now);
    setErrors(found);
    if (hasErrors(found)) return focusFirstError(found);

    setPending(true);
    const result = await createPoll({
      title: title.trim(),
      options: filledOptions(options),
      closesAt: closesAt!.toISOString(),
      voteType,
      maxChoices: voteType === "multi" ? maxChoices : 1,
      suggestionsEnabled,
    });

    if (result.ok) {
      // Keep the button pending while the share step loads.
      return router.push(`/polls/${encodeURIComponent(result.data.slug)}/share`);
    }
    setPending(false);
    if (result.status === 401) return window.location.assign(loginUrlForCurrentPage());
    setFailure(
      result.error.code === "NETWORK" || result.error.code === "INTERNAL"
        ? failureCopy(result)
        : // Rule messages are written for people ("Each option needs a different name.").
          result.error.message,
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-8">
      {failure && <FormAlert>{failure}</FormAlert>}

      <section aria-labelledby="question-heading" className="rounded-lg border-[2.5px] border-cocoa bg-card p-5 motion-safe:animate-rise sm:p-7">
        <h2 id="question-heading" className="font-display text-lg font-extrabold">
          What are you settling?
        </h2>
        <div className="mt-4">
          <TextField
            id="poll-title"
            label="Question"
            placeholder="Pizza night: what are we ordering?"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              revalidate({ title: event.target.value });
            }}
            error={errors.title}
            maxLength={LIMITS.titleLength}
            required
          />
        </div>

        <fieldset className="mt-6" aria-describedby={errors.options ? "options-error" : undefined}>
          <legend className="text-sm font-bold">Options</legend>
          <ol role="list" className="mt-2 flex flex-col gap-3">
            {options.map((option, index) => {
              const rowError = errors.optionRows?.[index];
              return (
                <li key={index} className="flex items-start gap-2 motion-safe:animate-rise">
                  <span aria-hidden="true" className="mt-3 w-5 shrink-0 text-right font-display text-sm font-extrabold text-cocoa-soft tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`option-${index}`} className="sr-only">
                      Option {index + 1}
                    </label>
                    <input
                      id={`option-${index}`}
                      value={option}
                      maxLength={LIMITS.optionLength}
                      onChange={(event) => setOption(index, event.target.value)}
                      onKeyDown={(event) => {
                        // Enter on the last filled row adds the next one, like a list.
                        if (event.key === "Enter" && index === options.length - 1 && option.trim()) {
                          event.preventDefault();
                          addOption();
                        }
                      }}
                      aria-invalid={rowError ? true : undefined}
                      aria-describedby={rowError ? `option-${index}-error` : undefined}
                      placeholder={index === 0 ? "Detroit-style from Emmy's" : index === 1 ? "Pepperoni from Slice House" : ""}
                      className={`min-h-12 w-full rounded-md bg-cream px-4 text-md placeholder:text-cocoa-soft ${
                        rowError ? "border-[2.5px] border-cocoa" : "border-2 border-cocoa"
                      }`}
                    />
                    {rowError && (
                      <p id={`option-${index}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-bold">
                        <WarningIcon size={16} className="mt-0.5 shrink-0" />
                        {rowError}
                      </p>
                    )}
                  </div>
                  {options.length > LIMITS.minOptions && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      aria-label={`Remove option ${index + 1}${option.trim() ? `, ${option.trim()}` : ""}`}
                      className="flex size-12 shrink-0 items-center justify-center rounded-full text-cocoa-soft hover:bg-cream-deep hover:text-cocoa"
                    >
                      <XIcon />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          {errors.options && (
            <p id="options-error" className="mt-2 flex items-start gap-1.5 text-sm font-bold">
              <WarningIcon size={16} className="mt-0.5 shrink-0" />
              {errors.options}
            </p>
          )}
          {options.length < LIMITS.maxOptions ? (
            <button
              type="button"
              onClick={addOption}
              className="mt-3 ml-7 flex min-h-11 items-center gap-2 rounded-full px-3 font-display text-sm font-bold hover:bg-cream-deep"
            >
              <PlusIcon />
              Add another option
            </button>
          ) : (
            <p className="mt-3 ml-7 text-sm text-cocoa-soft">That&rsquo;s the maximum of {LIMITS.maxOptions} options.</p>
          )}
        </fieldset>
      </section>

      <section aria-labelledby="rules-heading" className="rounded-lg border-[2.5px] border-cocoa bg-card p-5 motion-safe:animate-rise sm:p-7" style={{ animationDelay: "80ms" }}>
        <h2 id="rules-heading" className="font-display text-lg font-extrabold">
          How it works
        </h2>

        <fieldset className="mt-4">
          <legend className="text-sm font-bold">Voting</legend>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {(
              [
                { value: "single", label: "One vote each" },
                { value: "multi", label: "Pick up to a few" },
              ] as const
            ).map((choice) => (
              <label
                key={choice.value}
                className={`flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-md border-2 px-4 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal ${
                  voteType === choice.value ? "border-teal-deep bg-teal-soft" : "border-cocoa bg-cream"
                }`}
              >
                <input
                  type="radio"
                  name="vote-type"
                  value={choice.value}
                  checked={voteType === choice.value}
                  onChange={() => {
                    setVoteType(choice.value);
                    revalidate({ voteType: choice.value });
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex size-6 items-center justify-center rounded-full border-2 ${voteType === choice.value ? "border-teal-deep bg-teal text-cream" : "border-cocoa"}`}
                >
                  {voteType === choice.value && <CheckIcon size={14} className="motion-safe:animate-check" />}
                </span>
                <span className="font-bold">{choice.label}</span>
              </label>
            ))}
          </div>
          {voteType === "multi" && (
            <div className="mt-3 motion-safe:animate-rise">
              <label htmlFor="max-choices" className="text-sm font-bold">
                Each person can pick up to
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  id="max-choices"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={Math.max(2, filledCount)}
                  value={maxChoices}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setMaxChoices(next);
                    revalidate({ maxChoices: next });
                  }}
                  aria-invalid={errors.maxChoices ? true : undefined}
                  aria-describedby={errors.maxChoices ? "max-choices-error" : undefined}
                  className={`min-h-12 w-24 rounded-md bg-cream px-4 text-md tabular-nums ${errors.maxChoices ? "border-[2.5px]" : "border-2"} border-cocoa`}
                />
                <span className="text-sm text-cocoa-soft">options</span>
              </div>
              {errors.maxChoices && (
                <p id="max-choices-error" className="mt-1.5 flex items-start gap-1.5 text-sm font-bold">
                  <WarningIcon size={16} className="mt-0.5 shrink-0" />
                  {errors.maxChoices}
                </p>
              )}
            </div>
          )}
        </fieldset>

        <label className="mt-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={suggestionsEnabled}
            onChange={(event) => setSuggestionsEnabled(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-cocoa p-0.5 transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal ${
              suggestionsEnabled ? "bg-teal" : "bg-cream-deep"
            }`}
          >
            <span
              className={`size-5 rounded-full border-2 border-cocoa bg-cream transition-transform motion-reduce:transition-none ${suggestionsEnabled ? "translate-x-5" : ""}`}
            />
          </span>
          <span>
            <span className="block font-bold">Let the crew suggest options</span>
            <span className="block text-sm text-cocoa-soft">You decide what makes it onto the ballot.</span>
          </span>
        </label>

        <ClosingTimeField closing={closing} error={errors.closesAt} className="mt-6" />
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t-2 border-cream-deep bg-cream/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="submit"
          aria-disabled={pending || now === null || undefined}
          className="press min-h-14 w-full rounded-full border-2 border-cocoa bg-tangerine-deep px-6 font-display text-base font-bold text-cream-bright shadow-press-tangerine aria-disabled:cursor-progress aria-disabled:opacity-80"
        >
          {pending ? "Creating your poll…" : "Create poll"}
        </button>
      </div>
    </form>
  );
}
