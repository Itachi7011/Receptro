import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { preferencesSchema } from "@/lib/validations/settings";
import { requireUser } from "@/lib/auth/requireUser";
import { ok, handleApiError } from "@/lib/api-response";

// Personal (per-user) preferences: theme and language. Not audit-logged —
// these are cosmetic, not business data.
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = preferencesSchema.parse(await req.json());

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    return ok({ theme: updated.theme, locale: updated.locale });
  } catch (err) {
    return handleApiError(err);
  }
}
