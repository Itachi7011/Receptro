import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";
import { agingBucket, daysOverdue, type AgingBucketKey } from "@/lib/invoice-utils";
import { toCsv, csvResponseHeaders } from "@/lib/csv";
import { handleApiError } from "@/lib/api-response";

interface DealerAging {
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
    for (const inv of rows) {
      const balance = inv.amount - inv.paidAmount;
      if (balance <= 0 || !inv.dealer) continue;
      const bucket = agingBucket(daysOverdue(inv.dueDate));
      const key = inv.dealer.id;
      if (!byDealer.has(key)) {
        byDealer.set(key, {
          name: inv.dealer.name,
          buckets: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
          total: 0,
        });
      }
      const entry = byDealer.get(key)!;
      entry.buckets[bucket] += balance;
      entry.total += balance;
    }

    const dealerRows = Array.from(byDealer.values())
      .sort((a, b) => b.total - a.total)
      .map((d) => ({
        dealer: d.name,
        current: d.buckets.current.toFixed(2),
        d1_30: d.buckets["1-30"].toFixed(2),
        d31_60: d.buckets["31-60"].toFixed(2),
        d61_90: d.buckets["61-90"].toFixed(2),
        d90_plus: d.buckets["90+"].toFixed(2),
        total: d.total.toFixed(2),
      }));

    const csv = toCsv(dealerRows, [
      { key: "dealer", label: "Dealer" },
      { key: "current", label: "Current" },
      { key: "d1_30", label: "1-30 days" },
      { key: "d31_60", label: "31-60 days" },
      { key: "d61_90", label: "61-90 days" },
      { key: "d90_plus", label: "90+ days" },
      { key: "total", label: "Total outstanding" },
    ]);

    return new NextResponse(csv, {
      headers: csvResponseHeaders(`aging-report-${new Date().toISOString().slice(0, 10)}.csv`),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
