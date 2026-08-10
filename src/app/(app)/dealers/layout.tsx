import type { Metadata } from "next";

// Sets the browser tab title for this one page. The root layout's title
// "template" (see src/app/layout.tsx) automatically adds " · Receptro"
// after it, so this just needs the page's own name.
export const metadata: Metadata = {
  title: "Dealers",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
