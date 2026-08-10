import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify your email",
  // This page has an email address sitting in the URL as a query
  // parameter, so it shouldn't be indexed or linked to from search
  // results.
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
