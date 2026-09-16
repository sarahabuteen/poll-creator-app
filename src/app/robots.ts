import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env().NEXT_PUBLIC_APP_URL;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The API and the creator's own screens have nothing to index. Vote links (/p/) stay
      // crawlable so chat previews work; their pages say noindex themselves.
      disallow: ["/api/", "/polls/", "/closed"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
