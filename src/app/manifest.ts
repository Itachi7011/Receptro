import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

// Next.js turns this into a real manifest.webmanifest file automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Distributor Credit & Collection Manager`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f2f4f0",
    theme_color: "#1f5d50",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
