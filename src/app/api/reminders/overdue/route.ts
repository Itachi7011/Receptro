import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, lt, or, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { invoices, businesses } from "@/db/schema";
import { daysOverdue } from "@/lib/invoice-utils";
import { sendOverdueReminderEmail } from "@/lib/email";
import { env } from "@/lib/env";

const REMINDER_COOLDOWN_DAYS = 3;

/**
 * System-wide overdue-invoice reminder sweep, meant to be triggered by an
 * external scheduler (Vercel Cron, a cron job, GitHub Actions, etc.) hitting
 * this endpoint daily — not by a logged-in user, so it's protected by
 * CRON_SECRET instead of a session cookie.
 *
 * Example Vercel Cron config (vercel.json):
 *   { "crons": [{ "path": "/api/reminders/overdue", "schedule": "0 9 * * *" }] }
 * Vercel automatically sends the right Authorization header for cron
 * requests when CRON_SECRET is set as an env var.
 */
export async function POST(req: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const cooldownCutoff = new Date(Date.now() - REMINDER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const dueInvoices = await db.query.invoices.findMany({
    where: and(
      ne(invoices.status, "PAID"),
      lt(invoices.dueDate, new Date()),
      or(isNull(invoices.lastReminderSentAt), lte(invoices.lastReminderSentAt, cooldownCutoff)),
    ),
    with: { dealer: true },
    limit: 500,
  });

  const businessCache = new Map<string, string>();
  let sent = 0;
  let skipped = 0;

  for (const invoice of dueInvoices) {
    if (!invoice.dealer?.email) {
      skipped++;
      continue;
    }

    let businessName = businessCache.get(invoice.businessId);
    if (!businessName) {
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, invoice.businessId))
        .limit(1);
      businessName = business?.name ?? "";
      businessCache.set(invoice.businessId, businessName);
    }

    const balance = invoice.amount - invoice.paidAmount;
    await sendOverdueReminderEmail(
      invoice.dealer.email,
      invoice.dealer.name,
      invoice.invoiceNumber,
      balance,
      Math.max(0, daysOverdue(invoice.dueDate)),
      businessName,
    );
    await db
      .update(invoices)
      .set({ lastReminderSentAt: new Date() })
      .where(eq(invoices.id, invoice.id));
    sent++;
  }

  return NextResponse.json({ success: true, data: { sent, skipped, checked: dueInvoices.length } });
}
