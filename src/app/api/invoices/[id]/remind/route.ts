import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, businesses } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";
import { daysOverdue } from "@/lib/invoice-utils";
import { sendOverdueReminderEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { ok, fail, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

// Manually send a payment reminder for one invoice — used from the invoice
// detail page's "Send reminder" button.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, id), eq(invoices.businessId, user.businessId)),
      with: { dealer: true },
    });
    if (!invoice) return fail("Invoice not found.", 404);
    if (invoice.status === "PAID") return fail("This invoice is already fully paid.", 400);
    if (!invoice.dealer?.email) {
      return fail("This dealer doesn't have an email address on file.", 400);
    }

    const [business] = await db.select().from(businesses).where(eq(businesses.id, user.businessId)).limit(1);
    const overdueDays = Math.max(0, daysOverdue(invoice.dueDate));
    const balance = invoice.amount - invoice.paidAmount;

    const result = await sendOverdueReminderEmail(
      invoice.dealer.email,
      invoice.dealer.name,
      invoice.invoiceNumber,
      balance,
      overdueDays,
      business?.name ?? "",
    );

    await db
      .update(invoices)
      .set({ lastReminderSentAt: new Date() })
      .where(eq(invoices.id, invoice.id));

    logAudit({
      actor: user,
      action: "invoice.reminder_sent",
      entityType: "invoice",
      entityId: invoice.id,
      entityLabel: invoice.invoiceNumber,
    });

    return ok({ message: "Reminder sent.", delivery: result.delivered });
  } catch (err) {
    return handleApiError(err);
  }
}
