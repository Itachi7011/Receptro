import { NextRequest } from "next/server";
import { and, eq, count } from "drizzle-orm";
import { db } from "@/db";
import { dealers, invoices } from "@/db/schema";
import { dealerUpdateSchema } from "@/lib/validations/dealer";
import { requireUser, requireRole } from "@/lib/auth/requireUser";
import { logAudit } from "@/lib/audit";
import { ok, fail, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const [dealer] = await db
      .select()
      .from(dealers)
      .where(and(eq(dealers.id, id), eq(dealers.businessId, user.businessId)))
      .limit(1);
    if (!dealer) return fail("Dealer not found.", 404);

    return ok({ dealer });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const body = dealerUpdateSchema.parse(await req.json());

    const [dealer] = await db
      .update(dealers)
      .set({
        ...body,
        contactPerson: body.contactPerson || undefined,
        phone: body.phone || undefined,
        email: body.email || undefined,
        address: body.address || undefined,
        gstNumber: body.gstNumber || undefined,
        notes: body.notes || undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(dealers.id, id), eq(dealers.businessId, user.businessId)))
      .returning();
    if (!dealer) return fail("Dealer not found.", 404);

    logAudit({
      actor: user,
      action: "dealer.updated",
      entityType: "dealer",
      entityId: dealer.id,
      entityLabel: dealer.name,
    });

    return ok({ dealer });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Deleting a dealer is destructive — require ADMIN or OWNER.
    const user = await requireRole(req, "ADMIN");
    const { id } = await params;

    const [{ invoiceCount }] = await db
      .select({ invoiceCount: count() })
      .from(invoices)
      .where(and(eq(invoices.dealerId, id), eq(invoices.businessId, user.businessId)));
    if (invoiceCount > 0) {
      return fail(
        "This dealer has invoices on record and can't be deleted. Mark them inactive instead.",
        409,
      );
    }

    const [dealer] = await db
      .delete(dealers)
      .where(and(eq(dealers.id, id), eq(dealers.businessId, user.businessId)))
      .returning();
    if (!dealer) return fail("Dealer not found.", 404);

    logAudit({
      actor: user,
      action: "dealer.deleted",
      entityType: "dealer",
      entityId: dealer.id,
      entityLabel: dealer.name,
    });

    return ok({ message: "Dealer deleted." });
  } catch (err) {
    return handleApiError(err);
  }
}
