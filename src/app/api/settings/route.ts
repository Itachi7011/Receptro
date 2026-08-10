import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { businessSettingsSchema } from "@/lib/validations/settings";
import { requireUser, requireRole } from "@/lib/auth/requireUser";
import { logAudit } from "@/lib/audit";
import { ok, fail, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const [business] = await db.select().from(businesses).where(eq(businesses.id, user.businessId)).limit(1);
    if (!business) return fail("Business not found.", 404);
    return ok({ business });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole(req, "ADMIN");
    const body = businessSettingsSchema.parse(await req.json());

    const [business] = await db
      .update(businesses)
      .set({
        name: body.name,
        gstNumber: body.gstNumber || undefined,
        address: body.address || undefined,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, user.businessId))
      .returning();

    logAudit({
      actor: user,
      action: "business.updated",
      entityType: "business",
      entityId: business.id,
      entityLabel: business.name,
    });

    return ok({ business });
  } catch (err) {
    return handleApiError(err);
  }
}
