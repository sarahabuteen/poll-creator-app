import type { Avatar } from "./types";

/** Hosted, keyless DiceBear "micah" avatar. We store seed + tint, never the image. */
export function avatarUrl({ seed, tint }: Avatar): string {
  const params = new URLSearchParams({ seed, backgroundColor: tint });
  return `https://api.dicebear.com/9.x/micah/svg?${params}`;
}
