import type { AvatarTint, Person } from "@/domain/views";

/**
 * The faces a voter can pick from. Fixed DiceBear seeds, so the preview is
 * exactly the avatar that gets saved (patterns.md: pick one mechanism and
 * keep the preview truthful). A handful beats an avatar builder.
 */
export const FACE_SEEDS = ["Juniper", "Otis", "Marlowe", "Bea", "Rafferty", "Sunny", "Ezra", "Pip"] as const;

export const TINTS: ReadonlyArray<{ value: AvatarTint; label: string }> = [
  { value: "cbe2d8", label: "Teal" },
  { value: "f8c9b9", label: "Peach" },
  { value: "f6e0a4", label: "Butter" },
  { value: "e3d2f2", label: "Lilac" },
];

export const NAME_MAX_LENGTH = 40;
export const SUGGESTION_MAX_LENGTH = 80;

export type Identity = { name: string; seed: string; tint: AvatarTint };

export const DEFAULT_IDENTITY: Identity = { name: "", seed: FACE_SEEDS[0], tint: TINTS[0].value };

export function identityAsPerson({ name, seed, tint }: Identity): Person {
  return { name: name.trim(), avatar: { seed, tint } };
}
