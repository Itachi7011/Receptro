import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { requireUser, requireRole } from "@/lib/auth/requireUser";
import { logAudit } from "@/lib/audit";
import { computeInvoiceStatus } from "@/lib/invoice-utils";
import { ok, fail, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const payment = await db.query.payments.findFirst({
      where: and(eq(payments.id, id), eq(payments.businessId, user.businessId)),
      with: { dealer: true, invoice: true },
    });
    if (!payment) return fail("Payment not found.", 404);

    return ok({ payment });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Reversing a payment is destructive — require ADMIN or OWNER.
    const user = await requireRole(req, "ADMIN");
    const { id } = await params;

    const deleted = await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, id), eq(payments.businessId, user.businessId)))
        .limit(1);
      if (!payment) return null;

      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, payment.invoiceId), eq(invoices.businessId, user.businessId)))
        .limit(1)
        .for("update");

      if (invoice) {
        const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount);
        await tx
          .update(invoices)
          .set({
            paidAmount: newPaidAmount,
            status: computeInvoiceStatus(invoice.amount, newPaidAmount),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoice.id));
      }

      await tx.delete(payments).where(eq(payments.id, payment.id));
      return payment;
    });

    if (!deleted) return fail("Payment not found.", 404);

    logAudit({
      actor: user,
      action: "payment.deleted",
      entityType: "payment",
      entityId: deleted.id,
      metadata: { amount: deleted.amount },
    });

    return ok({ message: "Payment removed and invoice balance restored." });
  } catch (err) {
    return handleApiError(err);
  }
}
