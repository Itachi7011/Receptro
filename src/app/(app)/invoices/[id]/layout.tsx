import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getServerSessionUser } from "@/lib/auth/session-server";
import { SITE_NAME } from "@/lib/seo";

// Same idea as the dealer detail page: use the actual invoice number as
// the browser tab title instead of a generic "Invoice". We add the
// "· Receptro" part ourselves — see the note in dealers/[id]/layout.tsx.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getServerSessionUser();
  if (!user) return { title: `Invoice · ${SITE_NAME}` };

  try {
    const [invoice] = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.businessId, user.businessId)))
      .limit(1);
    return { title: `${invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice"} · ${SITE_NAME}` };
  } catch {
    return { title: `Invoice · ${SITE_NAME}` };
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
