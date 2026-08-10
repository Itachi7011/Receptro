import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Next.js turns this file into a real /sitemap.xml automatically. Only the
// public pages go in here — there's no point listing the logged-in app
// pages since robots.ts already tells search engines to skip them.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
