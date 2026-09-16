import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** Only the public pages. Polls are private to whoever has the link. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env().NEXT_PUBLIC_APP_URL;
  return [
    { url: `${base}/guest`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.8 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
