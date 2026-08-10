import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

// Everything under this folder is a logged-in page (dashboard, dealers,
// invoices, etc.) — that's private business data, so we tell search
// engines not to index any of it. Individual pages can still set their
// own <title> (see e.g. dashboard/layout.tsx), this "robots" rule just
// applies to all of them at once.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// This file has to be a plain server component so the `metadata` export
// above works (Next.js only reads `metadata` from server components). All
// the actual interactive header/sidebar code lives in AppShell, which is
// a client component.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
