import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { parse } from "csv-parse/sync";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, dealers } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";
import { logAudit } from "@/lib/audit";
import { ok, fail, handleApiError } from "@/lib/api-response";

interface ImportRow {
  dealer: string;
  invoicenumber: string;
  amount: string;
  issuedate: string;
  duedate: string;
  notes?: string;
}

interface RowError {
  row: number;
  message: string;
}

const MAX_ROWS = 500;

// Bulk-import invoices from a CSV with columns:
// dealer, invoiceNumber, amount, issueDate, dueDate, notes
// `dealer` is matched by exact (case-insensitive) name against your
// existing dealers — it does not create new dealers.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return fail("No file provided. Attach a CSV under the 'file' field.", 400);
    }
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      return fail("Only .csv files are supported.", 400);
    }

    const text = await file.text();
    let records: ImportRow[];
    try {
      records = parse(text, {
        columns: (header: string[]) => header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "")),
        skip_empty_lines: true,
        trim: true,
      }) as ImportRow[];
    } catch {
      return fail("Couldn't parse this file as CSV. Check the format and try again.", 400);
    }

    if (records.length === 0) return fail("The file has no rows to import.", 400);
    if (records.length > MAX_ROWS) {
      return fail(`Too many rows — please import at most ${MAX_ROWS} at a time.`, 400);
    }

    // Pre-load this business's dealers once, matched case-insensitively.
    const businessDealers = await db.select().from(dealers).where(eq(dealers.businessId, user.businessId));
    const dealerByName = new Map(businessDealers.map((d) => [d.name.trim().toLowerCase(), d]));

    const toInsert: (typeof invoices.$inferInsert)[] = [];
    const errors: RowError[] = [];
    const seenInvoiceNumbers = new Set<string>();

    records.forEach((raw, idx) => {
      const rowNum = idx + 2; // +1 for header, +1 for 1-indexing
      const dealerName = (raw.dealer ?? "").trim();
      const invoiceNumber = (raw.invoicenumber ?? "").trim();
      const amountRaw = (raw.amount ?? "").trim();
      const issueDateRaw = (raw.issuedate ?? "").trim();
      const dueDateRaw = (raw.duedate ?? "").trim();
      const notes = (raw.notes ?? "").trim();

      if (!dealerName || !invoiceNumber || !amountRaw || !issueDateRaw || !dueDateRaw) {
        errors.push({ row: rowNum, message: "Missing required field(s)." });
        return;
      }

      const dealer = dealerByName.get(dealerName.toLowerCase());
      if (!dealer) {
        errors.push({ row: rowNum, message: `No dealer found named "${dealerName}".` });
        return;
      }

      const amount = Number(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push({ row: rowNum, message: `Invalid amount "${amountRaw}".` });
        return;
      }

      const issueDate = new Date(issueDateRaw);
      const dueDate = new Date(dueDateRaw);
      if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
        errors.push({ row: rowNum, message: "Invalid date — use YYYY-MM-DD." });
        return;
      }
      if (dueDate < issueDate) {
        errors.push({ row: rowNum, message: "Due date is before issue date." });
        return;
      }

      const key = invoiceNumber.toLowerCase();
      if (seenInvoiceNumbers.has(key)) {
        errors.push({ row: rowNum, message: `Duplicate invoice number "${invoiceNumber}" in this file.` });
        return;
      }
      seenInvoiceNumbers.add(key);

      toInsert.push({
        id: randomUUID(),
        businessId: user.businessId,
        dealerId: dealer.id,
        invoiceNumber,
        amount,
        paidAmount: 0,
        issueDate,
        dueDate,
        status: "UNPAID",
        notes: notes || undefined,
      });
    });

    // Also skip rows whose invoice number already exists for this business.
    if (toInsert.length > 0) {
      const existing = await db
        .select({ invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(eq(invoices.businessId, user.businessId));
      const existingNumbers = new Set(existing.map((i) => i.invoiceNumber.toLowerCase()));

      for (let i = toInsert.length - 1; i >= 0; i--) {
        const inv = toInsert[i];
        if (existingNumbers.has(inv.invoiceNumber.toLowerCase())) {
          errors.push({ row: -1, message: `Invoice "${inv.invoiceNumber}" already exists — skipped.` });
          toInsert.splice(i, 1);
        }
      }
    }

    let created = 0;
    if (toInsert.length > 0) {
      const inserted = await db.insert(invoices).values(toInsert).returning();
      created = inserted.length;
    }

    // Also match by dealer contact fields for a friendlier error hint (no
    // dealer-creation restraint needed here since it's not required).

    logAudit({
      actor: user,
      action: "invoice.imported",
      entityType: "invoice",
      metadata: { created, errorCount: errors.length },
    });

    return ok({ created, skipped: errors.length, errors }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
