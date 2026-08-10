import { NextRequest } from "next/server";
import { and, eq, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { invoiceUpdateSchema } from "@/lib/validations/invoice";
import { requireUser, requireRole } from "@/lib/auth/requireUser";
import { logAudit } from "@/lib/audit";
import { computeInvoiceStatus } from "@/lib/invoice-utils";
import { ok, fail, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, id), eq(invoices.businessId, user.businessId)),
      with: { dealer: true },
    });
    if (!invoice) return fail("Invoice not found.", 404);

    const invoicePayments = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoice.id))
      .orderBy(desc(payments.paymentDate));

    return ok({ invoice, payments: invoicePayments });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const body = invoiceUpdateSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.businessId, user.businessId)))
      .limit(1);
    if (!existing) return fail("Invoice not found.", 404);

    if (body.amount !== undefined && body.amount < existing.paidAmount) {
      return fail("New amount can't be less than the amount already paid.", 400);
    }

    const newAmount = body.amount ?? existing.amount;
    const [invoice] = await db
      .update(invoices)
      .set({
        ...body,
        notes: body.notes || undefined,
        status: computeInvoiceStatus(newAmount, existing.paidAmount),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();

    logAudit({
      actor: user,
      action: "invoice.updated",
      entityType: "invoice",
      entityId: invoice.id,
      entityLabel: invoice.invoiceNumber,
    });

    return ok({ invoice });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Deleting an invoice is destructive — require ADMIN or OWNER.
    const user = await requireRole(req, "ADMIN");
    const { id } = await params;

    const [{ paymentCount }] = await db
      .select({ paymentCount: count() })
      .from(payments)
      .where(and(eq(payments.invoiceId, id), eq(payments.businessId, user.businessId)));
    if (paymentCount > 0) {
      return fail(
        "This invoice has payments recorded and can't be deleted. Delete the payments first.",
        409,
      );
    }

    const [invoice] = await db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.businessId, user.businessId)))
      .returning();
    if (!invoice) return fail("Invoice not found.", 404);

    logAudit({
      actor: user,
      action: "invoice.deleted",
      entityType: "invoice",
      entityId: invoice.id,
      entityLabel: invoice.invoiceNumber,
    });

    return ok({ message: "Invoice deleted." });
  } catch (err) {
    return handleApiError(err);
  }
}
