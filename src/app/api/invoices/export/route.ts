import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";
import { toCsv, csvResponseHeaders } from "@/lib/csv";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const rows = await db.query.invoices.findMany({
      where: eq(invoices.businessId, user.businessId),
      with: { dealer: true },
      orderBy: asc(invoices.dueDate),
    });

    const csv = toCsv(
      rows.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        dealer: inv.dealer?.name ?? "",
        amount: inv.amount.toFixed(2),
        paidAmount: inv.paidAmount.toFixed(2),
        balance: (inv.amount - inv.paidAmount).toFixed(2),
        issueDate: inv.issueDate.toISOString().slice(0, 10),
        dueDate: inv.dueDate.toISOString().slice(0, 10),
        status: inv.status,
      })),
      [
        { key: "invoiceNumber", label: "Invoice number" },
        { key: "dealer", label: "Dealer" },
        { key: "amount", label: "Amount" },
        { key: "paidAmount", label: "Paid" },
        { key: "balance", label: "Balance" },
        { key: "issueDate", label: "Issue date" },
        { key: "dueDate", label: "Due date" },
        { key: "status", label: "Status" },
      ],
    );

    return new NextResponse(csv, {
      headers: csvResponseHeaders(`invoices-${new Date().toISOString().slice(0, 10)}.csv`),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
