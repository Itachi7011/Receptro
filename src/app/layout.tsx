import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  // metadataBase turns the relative URLs used below (openGraph.images,
  // etc.) into full URLs automatically. Update SITE_URL in src/lib/seo.ts
  // once you have a real domain, and every page's metadata updates too.
  metadataBase: new URL(SITE_URL),

  // "template" lets each individual page just say its own name (e.g.
  // "Dashboard") and Next.js fills in the rest, so tabs read
  // "Dashboard · Receptro" instead of every page repeating the full name.
  title: {
    default: `${SITE_NAME} — Distributor Credit & Collection Manager`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "distributor credit management",
    "dealer collections software",
    "accounts receivable",
    "credit limit tracking",
    "invoice aging report",
    "collections SaaS",
  ],

  // Default rule for the whole site: allow search engines to index it.
  // Pages inside the logged-in app (dashboard, dealers, invoices, etc.)
  // override this to "noindex" — see src/app/(app)/layout.tsx — because
  // that's private business data and has no business showing up in search
  // results.
  robots: { index: true, follow: true },

  // What shows up when this page is shared on WhatsApp, LinkedIn,
  // Facebook, etc.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Distributor Credit & Collection Manager`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  // What shows up when this page is shared on X/Twitter.
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — Distributor Credit & Collection Manager`,
    description: SITE_DESCRIPTION,
  },

  icons: {
    icon: "/favicon.ico",
  },
};

// Applies the saved theme before first paint, so there's no flash of the
// default theme on reload. Runs as an inline script (not a React effect)
// specifically to beat hydration.
const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("receptro-theme");
    var locale = localStorage.getItem("receptro-locale");
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    if (locale) document.documentElement.lang = locale;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>{children}</AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
