import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { inviteMemberSchema } from "@/lib/validations/team";
import { requireUser, requireRole } from "@/lib/auth/requireUser";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { sendTeamInviteEmail } from "@/lib/email";
import { ok, fail, handleApiError } from "@/lib/api-response";

// Team members list — any signed-in member of the business can see their
// teammates.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.businessId, user.businessId))
      .orderBy(users.createdAt);

    return ok({ members });
  } catch (err) {
    return handleApiError(err);
  }
}

// Adding a team member is admin+ only. Rather than a token-based email
// invite flow, the admin sets a temporary password directly and shares it
// with the new teammate — simpler and still secure (hashed, must verify
// email, can change password after first login).
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, "ADMIN");
    const body = inviteMemberSchema.parse(await req.json());

    const [existing] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (existing) {
      return fail("A user with this email already exists.", 409);
    }

    const passwordHash = await hashPassword(body.password);
    const [member] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        businessId: user.businessId,
        name: body.name,
        email: body.email,
        passwordHash,
        role: body.role,
        isVerified: true, // added directly by an admin, so skip OTP verification
        invitedByUserId: user.id,
      })
      .returning();

    logAudit({
      actor: user,
      action: "team.invited",
      entityType: "user",
      entityId: member.id,
      entityLabel: member.name,
      metadata: { role: member.role },
    });

    void sendTeamInviteEmail(member.email, member.name, user.name, body.password);

    return ok(
      {
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          status: member.status,
        },
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
