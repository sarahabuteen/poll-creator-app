import type { Person } from "@/domain/views";

/** Our own avatar endpoint (DiceBear "micah" rendered locally). We store seed + tint, never the image. */
export function avatarUrl({ seed, tint }: Person["avatar"]): string {
  return `/api/avatars/${encodeURIComponent(seed)}/${tint}`;
}
