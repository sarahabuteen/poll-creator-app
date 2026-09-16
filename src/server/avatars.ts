import { createAvatar } from "@dicebear/core";
import * as micah from "@dicebear/micah";
import { AVATAR_TINTS } from "@/domain/inputs";
import type { AvatarTint } from "@/domain/views";

export const MAX_SEED_LENGTH = 64;

export function isAvatarTint(value: string): value is AvatarTint {
  return (AVATAR_TINTS as readonly string[]).includes(value);
}

/**
 * DiceBear "micah", rendered locally: byte-for-byte what the hosted 9.x API
 * returns, without a third-party request (or outage) behind every face.
 */
export function renderAvatar(seed: string, tint: AvatarTint): string {
  return createAvatar(micah, { seed, backgroundColor: [tint] }).toString();
}
