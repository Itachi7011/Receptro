import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dealers } from "@/db/schema";
import { getServerSessionUser } from "@/lib/auth/session-server";
import { SITE_NAME } from "@/lib/seo";

// This page's title depends on which dealer you're looking at, so instead
// of a fixed "title" like the other pages, we look the dealer up and use
// their name — e.g. the browser tab says "Sharma Traders · Receptro".
// (We add the "· Receptro" part ourselves here — the automatic title
// template from the root layout doesn't apply to titles built this way,
// inside a generateMetadata function.)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getServerSessionUser();
  if (!user) return { title: `Dealer · ${SITE_NAME}` };

  try {
    const [dealer] = await db
      .select({ name: dealers.name })
      .from(dealers)
      .where(and(eq(dealers.id, id), eq(dealers.businessId, user.businessId)))
      .limit(1);
    return { title: `${dealer?.name ?? "Dealer"} · ${SITE_NAME}` };
  } catch {
    // e.g. `id` isn't a valid UUID — fall back to a generic title instead
    // of breaking the page.
    return { title: `Dealer · ${SITE_NAME}` };
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
