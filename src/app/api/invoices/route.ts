import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { and, eq, asc, count, ilike, lt, ne, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoices, dealers } from "@/db/schema";
import { invoiceSchema } from "@/lib/validations/invoice";
import { requireUser } from "@/lib/auth/requireUser";
import { logAudit } from "@/lib/audit";
import { ok, fail, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const dealerId = searchParams.get("dealer");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const overdueOnly = searchParams.get("overdue") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const conditions: SQL[] = [eq(invoices.businessId, user.businessId)];
    if (dealerId) conditions.push(eq(invoices.dealerId, dealerId));
    if (status === "UNPAID" || status === "PARTIAL" || status === "PAID") {
      conditions.push(eq(invoices.status, status));
    }
    if (search) conditions.push(ilike(invoices.invoiceNumber, `%${search}%`));
    if (overdueOnly) {
      conditions.push(ne(invoices.status, "PAID"));
      conditions.push(lt(invoices.dueDate, new Date()));
    }
    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db.query.invoices.findMany({
        where,
        with: { dealer: true },
        orderBy: asc(invoices.dueDate),
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ total: count() }).from(invoices).where(where),
    ]);

    return ok({ invoices: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = invoiceSchema.parse(await req.json());

    const [dealer] = await db
      .select()
      .from(dealers)
      .where(and(eq(dealers.id, body.dealer), eq(dealers.businessId, user.businessId)))
      .limit(1);
    if (!dealer) return fail("Dealer not found.", 404);

    const [invoice] = await db
      .insert(invoices)
      .values({
        id: randomUUID(),
        businessId: user.businessId,
        dealerId: dealer.id,
        invoiceNumber: body.invoiceNumber,
        amount: body.amount,
        issueDate: body.issueDate,
        dueDate: body.dueDate,
        notes: body.notes || undefined,
        attachmentUrl: body.attachmentUrl || undefined,
        attachmentPublicId: body.attachmentPublicId || undefined,
        status: "UNPAID",
        paidAmount: 0,
      })
      .returning();

    logAudit({
      actor: user,
      action: "invoice.created",
      entityType: "invoice",
      entityId: invoice.id,
      entityLabel: invoice.invoiceNumber,
      metadata: { amount: invoice.amount, dealer: dealer.name },
    });

    return ok({ invoice }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
