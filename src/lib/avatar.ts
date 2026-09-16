import type { Person } from "@/domain/views";

/** Hosted, keyless DiceBear "micah" avatar. We store seed + tint, never the image. */
export function avatarUrl({ seed, tint }: Person["avatar"]): string {
  const params = new URLSearchParams({ seed, backgroundColor: tint });
  return `https://api.dicebear.com/9.x/micah/svg?${params}`;
}
