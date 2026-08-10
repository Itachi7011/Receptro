import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Next.js turns this file into a real /robots.txt automatically — you
// don't need to create the .txt file by hand.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // The marketing/sign-in pages are fine for search engines to show.
        allow: ["/", "/login", "/register"],
        // Everything inside the logged-in app is private business data —
        // search engines should never crawl or show it.
        disallow: [
          "/api/",
          "/dashboard",
          "/dealers",
          "/invoices",
          "/payments",
          "/reports",
          "/team",
          "/settings",
          "/audit-log",
          "/verify-otp",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
