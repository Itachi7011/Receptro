import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { updateMemberSchema } from "@/lib/validations/team";
import { requireRole } from "@/lib/auth/requireUser";
import { logAudit } from "@/lib/audit";
import { ok, fail, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireRole(req, "ADMIN");
    const { id } = await params;
    const body = updateMemberSchema.parse(await req.json());

    const [target] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.businessId, actor.businessId)))
      .limit(1);
    if (!target) return fail("Team member not found.", 404);
    if (target.role === "OWNER") return fail("The account owner's role can't be changed.", 403);
    if (target.id === actor.id) return fail("You can't change your own role or status.", 403);
    // Only the OWNER can promote someone to ADMIN or change an ADMIN's access.
    if ((body.role === "ADMIN" || target.role === "ADMIN") && actor.role !== "OWNER") {
      return fail("Only the account owner can manage admin access.", 403);
    }

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    logAudit({
      actor,
      action: body.status === "SUSPENDED" ? "team.suspended" : body.role ? "team.role_changed" : "team.reactivated",
      entityType: "user",
      entityId: updated.id,
      entityLabel: updated.name,
      metadata: { role: updated.role, status: updated.status },
    });

    return ok({
      member: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireRole(req, "ADMIN");
    const { id } = await params;

    const [target] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.businessId, actor.businessId)))
      .limit(1);
    if (!target) return fail("Team member not found.", 404);
    if (target.role === "OWNER") return fail("The account owner can't be removed.", 403);
    if (target.id === actor.id) return fail("You can't remove your own account.", 403);
    if (target.role === "ADMIN" && actor.role !== "OWNER") {
      return fail("Only the account owner can remove an admin.", 403);
    }

    await db.delete(users).where(eq(users.id, id));

    logAudit({
      actor,
      action: "team.removed",
      entityType: "user",
      entityId: target.id,
      entityLabel: target.name,
    });

    return ok({ message: "Team member removed." });
  } catch (err) {
    return handleApiError(err);
  }
}
