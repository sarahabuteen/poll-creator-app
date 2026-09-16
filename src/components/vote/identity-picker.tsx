"use client";

import type { Ref } from "react";
import { Avatar } from "@/components/avatar";
import { CheckIcon } from "@/components/icons";
import { TextField } from "@/components/forms/text-field";
import { FACE_SEEDS, identityAsPerson, NAME_MAX_LENGTH, TINTS, type Identity } from "@/lib/vote/presets";

type IdentityPickerProps = {
  identity: Identity;
  onChange: (identity: Identity) => void;
  nameError?: string;
  nameRef: Ref<HTMLInputElement>;
};

/** Name, face, background: the personality moment, kept to three quick choices. */
export function IdentityPicker({ identity, onChange, nameError, nameRef }: IdentityPickerProps) {
  const person = identityAsPerson(identity);

  return (
    <section aria-labelledby="identity-heading" className="rounded-lg border-[2.5px] border-cocoa bg-card p-5 sm:p-7">
      <div className="flex items-center gap-4">
        {/* Keyed so the preview pops each time the face or colour changes. */}
        <span key={`${identity.seed}-${identity.tint}`} className="motion-safe:animate-pop">
          <Avatar person={person} size={64} />
        </span>
        <div className="min-w-0">
          <h2 id="identity-heading" className="font-display text-lg font-extrabold">
            Who&rsquo;s voting?
          </h2>
          <p className="text-sm text-cocoa-soft">
            {person.name ? <>Your crew will see you as {person.name}</> : "Your crew sees your name and face"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <TextField
          id="voter-name"
          label="Your name"
          value={identity.name}
          onChange={(event) => onChange({ ...identity, name: event.target.value })}
          error={nameError}
          inputRef={nameRef}
          autoComplete="given-name"
          maxLength={NAME_MAX_LENGTH}
          required
        />
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-bold">Pick a face</legend>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {FACE_SEEDS.map((seed, index) => {
            const checked = identity.seed === seed;
            return (
              <label key={seed} className="group relative flex cursor-pointer justify-center">
                <input
                  type="radio"
                  name="face"
                  value={seed}
                  checked={checked}
                  onChange={() => onChange({ ...identity, seed })}
                  className="peer sr-only"
                />
                <span className="sr-only">Face {index + 1}</span>
                <span
                  className={`rounded-full p-0.5 transition-transform peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal motion-safe:group-hover:-translate-y-0.5 ${
                    checked ? "ring-3 ring-teal" : ""
                  }`}
                >
                  <Avatar person={{ name: "", avatar: { seed, tint: identity.tint } }} size={52} />
                </span>
                {checked && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 right-0 flex size-5 items-center justify-center rounded-full border-2 border-cocoa bg-teal text-cream motion-safe:animate-check"
                  >
                    <CheckIcon size={12} />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-sm font-bold">Background</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TINTS.map(({ value, label }) => {
            const checked = identity.tint === value;
            return (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="tint"
                  value={value}
                  checked={checked}
                  onChange={() => onChange({ ...identity, tint: value })}
                  className="peer sr-only"
                />
                <span
                  className={`flex min-h-11 items-center gap-2 rounded-full border-2 px-3 pr-4 text-sm font-bold peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal ${
                    checked ? "border-cocoa bg-cream-deep" : "border-cream-deep"
                  }`}
                >
                  <span aria-hidden="true" className="size-6 rounded-full border-[1.5px] border-cocoa" style={{ backgroundColor: `#${value}` }} />
                  {label}
                  {checked && <CheckIcon size={14} className="motion-safe:animate-check" />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
