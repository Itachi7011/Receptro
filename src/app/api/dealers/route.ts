import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { and, eq, ilike, or, desc, count, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { dealers } from "@/db/schema";
import { dealerSchema } from "@/lib/validations/dealer";
import { requireUser } from "@/lib/auth/requireUser";
import { logAudit } from "@/lib/audit";
import { ok, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const conditions: SQL[] = [eq(dealers.businessId, user.businessId)];
    if (search) {
      conditions.push(
        or(
          ilike(dealers.name, `%${search}%`),
          ilike(dealers.contactPerson, `%${search}%`),
          ilike(dealers.phone, `%${search}%`),
        )!,
      );
    }
    if (status === "ACTIVE" || status === "INACTIVE") {
      conditions.push(eq(dealers.status, status));
    }
    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(dealers)
        .where(where)
        .orderBy(desc(dealers.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: count() }).from(dealers).where(where),
    ]);

    return ok({ dealers: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = dealerSchema.parse(await req.json());

    const [dealer] = await db
      .insert(dealers)
      .values({
        id: randomUUID(),
        businessId: user.businessId,
        name: body.name,
        contactPerson: body.contactPerson || undefined,
        phone: body.phone || undefined,
        email: body.email || undefined,
        address: body.address || undefined,
        gstNumber: body.gstNumber || undefined,
        creditLimit: body.creditLimit,
        status: body.status,
        notes: body.notes || undefined,
      })
      .returning();

    logAudit({
      actor: user,
      action: "dealer.created",
      entityType: "dealer",
      entityId: dealer.id,
      entityLabel: dealer.name,
    });

    return ok({ dealer }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
