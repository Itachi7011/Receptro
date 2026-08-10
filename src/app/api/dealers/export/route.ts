import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dealers } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";
import { toCsv, csvResponseHeaders } from "@/lib/csv";
import { handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const rows = await db.select().from(dealers).where(eq(dealers.businessId, user.businessId));

    const csv = toCsv(
      rows.map((d) => ({
        name: d.name,
        contactPerson: d.contactPerson ?? "",
        phone: d.phone ?? "",
        email: d.email ?? "",
        gstNumber: d.gstNumber ?? "",
        creditLimit: d.creditLimit.toFixed(2),
        status: d.status,
        address: d.address ?? "",
      })),
      [
        { key: "name", label: "Name" },
        { key: "contactPerson", label: "Contact person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "gstNumber", label: "GST number" },
        { key: "creditLimit", label: "Credit limit" },
        { key: "status", label: "Status" },
        { key: "address", label: "Address" },
      ],
    );

    return new NextResponse(csv, {
      headers: csvResponseHeaders(`dealers-${new Date().toISOString().slice(0, 10)}.csv`),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
