import { NextRequest } from "next/server";
import { eq, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requireRole } from "@/lib/auth/requireUser";
import { ok, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, "ADMIN");

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 30)));

    const where = eq(auditLogs.businessId, user.businessId);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ total: count() }).from(auditLogs).where(where),
    ]);

    return ok({ logs: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return handleApiError(err);
  }
}
