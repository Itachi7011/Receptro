import { NextRequest } from "next/server";
import { and, eq, ne, lt, gte, lte, desc, sql, count } from "drizzle-orm";
import { db } from "@/db";
import { invoices, dealers, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";
import { ok, handleApiError } from "@/lib/api-response";

// Casting to ::float8 makes node-postgres return a real JS number for the
// aggregate instead of the text representation Postgres uses for NUMERIC.
const balanceSum = sql<number>`coalesce(sum((${invoices.amount} - ${invoices.paidAmount})::float8), 0)`;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      [outstandingAgg],
      [overdueAgg],
      [dueSoonAgg],
      [{ dealerCount }],
      [{ invoiceCount }],
      recentPayments,
      topOverdueDealers,
    ] = await Promise.all([
      db
        .select({ total: balanceSum, count: count() })
        .from(invoices)
        .where(and(eq(invoices.businessId, user.businessId), ne(invoices.status, "PAID"))),
      db
        .select({ total: balanceSum, count: count() })
        .from(invoices)
        .where(and(eq(invoices.businessId, user.businessId), ne(invoices.status, "PAID"), lt(invoices.dueDate, now))),
      db
        .select({ total: balanceSum, count: count() })
        .from(invoices)
        .where(
          and(
            eq(invoices.businessId, user.businessId),
            ne(invoices.status, "PAID"),
            gte(invoices.dueDate, now),
            lte(invoices.dueDate, sevenDaysOut),
          ),
        ),
      db.select({ dealerCount: count() }).from(dealers).where(eq(dealers.businessId, user.businessId)),
      db.select({ invoiceCount: count() }).from(invoices).where(eq(invoices.businessId, user.businessId)),
      db.query.payments.findMany({
        where: eq(payments.businessId, user.businessId),
        with: { dealer: true, invoice: true },
        orderBy: desc(payments.paymentDate),
        limit: 5,
      }),
      db
        .select({
          dealerId: invoices.dealerId,
          name: dealers.name,
          outstanding: balanceSum,
          invoiceCount: count(),
        })
        .from(invoices)
        .innerJoin(dealers, eq(dealers.id, invoices.dealerId))
        .where(and(eq(invoices.businessId, user.businessId), ne(invoices.status, "PAID"), lt(invoices.dueDate, now)))
        .groupBy(invoices.dealerId, dealers.name)
        .orderBy(desc(balanceSum))
        .limit(5),
    ]);

    return ok({
      totalOutstanding: outstandingAgg?.total ?? 0,
      outstandingInvoiceCount: outstandingAgg?.count ?? 0,
      overdueAmount: overdueAgg?.total ?? 0,
      overdueInvoiceCount: overdueAgg?.count ?? 0,
      dueSoonAmount: dueSoonAgg?.total ?? 0,
      dueSoonInvoiceCount: dueSoonAgg?.count ?? 0,
      dealerCount,
      invoiceCount,
      recentPayments,
      topOverdueDealers,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
