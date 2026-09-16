"use client";

import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { TextField } from "@/components/forms/text-field";
import { SheetDialog } from "@/components/vote/sheet-dialog";
import { failureCopy, suggestOption } from "@/lib/api/client";
import { identityAsPerson, NAME_MAX_LENGTH, SUGGESTION_MAX_LENGTH, type Identity } from "@/lib/vote/presets";

type SuggestDialogProps = {
  open: boolean;
  slug: string;
  identity: Identity;
  onIdentityChange: (identity: Identity) => void;
  onClose: () => void;
  /** Called with the suggested label once the organiser has it. */
  onSent: (label: string) => void;
  /** The poll changed underneath (closed, suggestions switched off): reload it. */
  onStale: () => void;
  /** Decided by the parent when opening: ask for a name only if the page doesn't have one yet. */
  askForName: boolean;
};

/** "Suggest something else": goes to the organiser, not straight onto the ballot. */
export function SuggestDialog({ open, slug, identity, onIdentityChange, onClose, onSent, onStale, askForName }: SuggestDialogProps) {
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<{ name?: string; label?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function close() {
    setErrors({});
    setFailure(null);
    onClose();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const found = {
      name: identity.name.trim() ? undefined : "Add your name so the organiser knows who suggested it.",
      label: label.trim() ? undefined : "Type the option you want to suggest.",
    };
    setErrors(found);
    setFailure(null);
    const firstInvalid = found.name ? "suggest-name" : found.label ? "suggest-label" : null;
    if (firstInvalid) return document.getElementById(firstInvalid)?.focus();

    setPending(true);
    const result = await suggestOption(slug, { label: label.trim(), suggestedBy: identityAsPerson(identity) });
    setPending(false);

    if (result.ok) {
      onSent(label.trim());
      setLabel("");
      return close();
    }
    switch (result.error.code) {
      case "DUPLICATE_OPTION":
        setErrors({ label: "That’s already on the ballot, or waiting for the organiser." });
        return document.getElementById("suggest-label")?.focus();
      case "SUGGESTIONS_DISABLED":
      case "POLL_SETTLED":
      case "POLL_NOT_FOUND":
        onStale();
        return setFailure("This poll isn’t taking suggestions any more.");
      case "TOO_MANY_OPTIONS":
        return setFailure("This poll has as many options as it can take.");
      case "TOO_MANY_SUGGESTIONS":
        // Written for voters: "You have 3 suggestions waiting already…"
        return setFailure(result.error.message);
      case "RATE_LIMITED":
        return setFailure("That\u2019s a lot of suggestions in a row. Wait a moment, then try again.");
      default:
        return setFailure(failureCopy(result));
    }
  }

  return (
    <SheetDialog open={open} title="Suggest something else" onClose={close}>
      <p className="mt-2 text-sm text-cocoa-soft">
        The organiser decides what goes on the ballot. If they add it, it shows up here with your name on it.
      </p>

      <form noValidate onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        {failure && <FormAlert>{failure}</FormAlert>}
        {askForName && (
          <TextField
            id="suggest-name"
            label="Your name"
            value={identity.name}
            onChange={(event) => onIdentityChange({ ...identity, name: event.target.value })}
            error={errors.name}
            autoComplete="given-name"
            maxLength={NAME_MAX_LENGTH}
            required
          />
        )}
        <TextField
          id="suggest-label"
          label="Your suggestion"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          error={errors.label}
          maxLength={SUGGESTION_MAX_LENGTH}
          autoFocus={!askForName}
          required
        />
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            className="min-h-12 rounded-full border-2 border-cocoa bg-card px-5 font-display font-bold hover:bg-cream-deep"
          >
            Cancel
          </button>
          <button
            type="submit"
            aria-disabled={pending || undefined}
            className="press min-h-12 rounded-full border-2 border-cocoa bg-teal px-6 font-display font-bold text-cream shadow-press-teal hover:bg-teal-deep aria-disabled:cursor-progress"
          >
            {pending ? "Sending…" : "Send suggestion"}
          </button>
        </div>
      </form>
    </SheetDialog>
  );
}
