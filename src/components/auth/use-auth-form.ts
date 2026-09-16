"use client";

import { useRef, useState, type FormEvent } from "react";
import type { AuthErrorCode, AuthResult } from "@/lib/auth/client";
import { invalidFields, type FieldErrors } from "@/lib/auth/validation";

type Options<Values extends Record<string, string>> = {
  initial: Values;
  /** Field order, used to focus the first invalid field. */
  fields: readonly (keyof Values & string)[];
  validate: (values: Values) => FieldErrors<keyof Values & string>;
  submit: (values: Values) => Promise<AuthResult>;
  onSuccess: () => void;
};

/**
 * Shared behaviour for the auth forms: validate on submit, move focus to the
 * first problem, re-check fields as they're fixed, and surface a failed
 * request without clearing what was typed.
 */
export function useAuthForm<Values extends Record<string, string>>({
  initial,
  fields,
  validate,
  submit,
  onSuccess,
}: Options<Values>) {
  type Field = keyof Values & string;

  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AuthErrorCode | null>(null);
  const inputs = useRef(new Map<Field, HTMLInputElement>());

  function field(name: Field) {
    return {
      id: name,
      name,
      value: values[name],
      error: errors[name],
      inputRef: (element: HTMLInputElement | null) => {
        if (element) inputs.current.set(name, element);
        else inputs.current.delete(name);
      },
      onChange: (event: { target: { value: string } }) => {
        const next = { ...values, [name]: event.target.value };
        setValues(next);
        // Once someone has tried to submit, let errors clear as they fix them.
        if (attempted) setErrors(validate(next));
      },
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setAttempted(true);
    setFailure(null);
    const found = validate(values);
    setErrors(found);
    const [first] = invalidFields(found, fields);
    if (first) {
      inputs.current.get(first)?.focus();
      return;
    }

    setPending(true);
    try {
      const result = await submit(values);
      if (result.ok) return onSuccess();
      setFailure(result.code);
    } catch {
      setFailure("NETWORK");
    } finally {
      // Focus stays on the submit button, ready for a retry; the alert announces itself.
      setPending(false);
    }
  }

  return { field, onSubmit, pending, failure };
}
