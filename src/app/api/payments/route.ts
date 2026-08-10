import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { and, eq, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments, dealers } from "@/db/schema";
import { paymentSchema } from "@/lib/validations/payment";
import { requireUser } from "@/lib/auth/requireUser";
import { logAudit } from "@/lib/audit";
import { computeInvoiceStatus } from "@/lib/invoice-utils";
import { sendPaymentRecordedEmail } from "@/lib/email";
import { ok, fail, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const dealerId = searchParams.get("dealer");
    const invoiceId = searchParams.get("invoice");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const conditions = [eq(payments.businessId, user.businessId)];
    if (dealerId) conditions.push(eq(payments.dealerId, dealerId));
    if (invoiceId) conditions.push(eq(payments.invoiceId, invoiceId));
    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db.query.payments.findMany({
        where,
        with: { dealer: true, invoice: true },
        orderBy: desc(payments.paymentDate),
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ total: count() }).from(payments).where(where),
    ]);

    return ok({ payments: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = paymentSchema.parse(await req.json());

    const result = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, body.invoice), eq(invoices.businessId, user.businessId)))
        .limit(1)
        .for("update");
      if (!invoice) throw new PaymentError("Invoice not found.", 404);

      const outstanding = invoice.amount - invoice.paidAmount;
      if (body.amount > outstanding) {
        throw new PaymentError(
          `Payment of ${body.amount} exceeds the outstanding balance of ${outstanding} on this invoice.`,
          400,
        );
      }

      const [payment] = await tx
        .insert(payments)
        .values({
          id: randomUUID(),
          businessId: user.businessId,
          dealerId: invoice.dealerId,
          invoiceId: invoice.id,
          amount: body.amount,
          paymentDate: body.paymentDate,
          method: body.method,
          referenceNumber: body.referenceNumber || undefined,
          notes: body.notes || undefined,
          recordedByUserId: user.id,
        })
        .returning();

      const newPaidAmount = invoice.paidAmount + body.amount;
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({
          paidAmount: newPaidAmount,
          status: computeInvoiceStatus(invoice.amount, newPaidAmount),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id))
        .returning();

      return { payment, invoice: updatedInvoice };
    });

    const [dealer] = await db.select().from(dealers).where(eq(dealers.id, result.invoice.dealerId)).limit(1);
    void sendPaymentRecordedEmail(
      user.email,
      dealer?.name ?? "Dealer",
      result.payment.amount,
      result.invoice.invoiceNumber,
      result.invoice.amount - result.invoice.paidAmount,
    );

    logAudit({
      actor: user,
      action: "payment.recorded",
      entityType: "payment",
      entityId: result.payment.id,
      entityLabel: result.invoice.invoiceNumber,
      metadata: { amount: result.payment.amount },
    });

    return ok(result, 201);
  } catch (err) {
    if (err instanceof PaymentError) return fail(err.message, err.status);
    return handleApiError(err);
  }
}

class PaymentError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
