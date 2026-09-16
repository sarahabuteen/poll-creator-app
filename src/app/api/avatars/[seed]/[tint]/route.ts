import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handle } from "@/server/api/http";
import { isAvatarTint, MAX_SEED_LENGTH, renderAvatar } from "@/server/avatars";

/**
 * GET /api/avatars/:seed/:tint → the face as SVG. The same seed and tint
 * always draw the same face, so it's cached for a year by browsers and CDNs.
 */
export const GET = handle(async (_request: NextRequest, ctx: RouteContext<"/api/avatars/[seed]/[tint]">) => {
  const { seed, tint } = await ctx.params;
  if (!seed || seed.length > MAX_SEED_LENGTH || !isAvatarTint(tint)) {
    throw new ApiError(400, "INVALID_INPUT", "Unknown avatar.");
  }

  return new NextResponse(renderAvatar(seed, tint), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      // An SVG opened directly is a document: never let it run anything.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
