import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";
import { ok, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, user.businessId))
      .limit(1);

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyName: business?.name ?? "",
        role: user.role,
        theme: user.theme,
        locale: user.locale,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
