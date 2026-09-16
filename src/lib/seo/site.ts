import type { Metadata } from "next";

export const SITE_NAME = "Tiebreak";

export const SITE_DESCRIPTION =
  "Settle it in the group chat. Make a poll in under a minute, share the link, and reveal the winner. Your crew votes without an account.";

const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Tiebreak: settle it in the group chat." };

/**
 * Title, description, canonical URL and link preview for one page. A page's
 * openGraph replaces the layout's rather than merging, so every page sends the
 * whole preview: site name, image and card size included.
 */
export function pageMetadata({ title, previewTitle = title, description, path }: { title: string; previewTitle?: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url: path, title: previewTitle, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: previewTitle, description, images: [OG_IMAGE] },
  };
}
