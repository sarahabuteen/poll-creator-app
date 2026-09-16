"use client";

import { useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import type { Person } from "@/lib/types";

type AvatarProps = {
  person: Person;
  /** Diameter in px. */
  size: number;
  /** Leave empty when the name is visible right beside the avatar. */
  alt?: string;
  className?: string;
};

/** Circular DiceBear avatar ringed in cocoa; falls back to a tinted circle if the image fails. */
export function Avatar({ person, size, alt = "", className = "" }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const ring = size >= 34 ? "border-[2.5px]" : "border-[1.5px]";
  const shared = `inline-block shrink-0 rounded-full border-cocoa ${ring} ${className}`;
  const style = { width: size, height: size, backgroundColor: `#${person.avatar.tint}` };

  if (failed) {
    return <span role={alt ? "img" : undefined} aria-label={alt || undefined} className={shared} style={style} />;
  }

  return (
    // DiceBear serves SVG; next/image adds nothing for a remote vector at these sizes.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl(person.avatar)}
      alt={alt}
      width={size}
      height={size}
      decoding="async"
      onError={() => setFailed(true)}
      className={shared}
      style={style}
    />
  );
}
