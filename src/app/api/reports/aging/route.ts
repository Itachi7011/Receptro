import { NextRequest } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";
import { agingBucket, daysOverdue, type AgingBucketKey } from "@/lib/invoice-utils";
import { ok, handleApiError } from "@/lib/api-response";

interface DealerAging {
  dealerId: string;
  name: string;
  buckets: Record<AgingBucketKey, number>;
  total: number;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const rows = await db.query.invoices.findMany({
      where: and(eq(invoices.businessId, user.businessId), ne(invoices.status, "PAID")),
      with: { dealer: true },
    });

    const byDealer = new Map<string, DealerAging>();
    const totals: Record<AgingBucketKey, number> = {
      current: 0,
      "1-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };

    for (const inv of rows) {
      const balance = inv.amount - inv.paidAmount;
      if (balance <= 0 || !inv.dealer) continue;

      const bucket = agingBucket(daysOverdue(inv.dueDate));
      const dealerId = inv.dealer.id;

      if (!byDealer.has(dealerId)) {
        byDealer.set(dealerId, {
          dealerId,
          name: inv.dealer.name,
          buckets: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
          total: 0,
        });
      }

      const entry = byDealer.get(dealerId)!;
      entry.buckets[bucket] += balance;
      entry.total += balance;
      totals[bucket] += balance;
    }

    const dealerRows = Array.from(byDealer.values()).sort((a, b) => b.total - a.total);
    const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);

    return ok({ rows: dealerRows, totals, grandTotal, asOf: new Date() });
  } catch (err) {
    return handleApiError(err);
  }
}
