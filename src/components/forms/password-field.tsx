"use client";

import { useState, type ComponentProps } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { TextField } from "./text-field";

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "trailing">;

/** A password input with a show/hide toggle, so people on phones can check what they typed. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          aria-label="Show password"
          aria-pressed={visible}
          aria-controls={props.id}
          onClick={() => setVisible((current) => !current)}
          className="flex size-11 items-center justify-center rounded-full text-cocoa hover:bg-cream-deep"
        >
          {visible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      }
    />
  );
}
