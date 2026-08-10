import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { User } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth/session";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

const ROLE_RANK: Record<User["role"], number> = { STAFF: 1, ADMIN: 2, OWNER: 3 };

/**
 * Resolves the current authenticated + verified + active user for an API
 * route. Throws AuthError (401/403) if there is no valid session — callers
 * should catch this and translate it into a JSON error response.
 */
export async function requireUser(req: NextRequest): Promise<User> {
  const session = await getSessionFromRequest(req);
  if (!session) throw new AuthError("Not authenticated. Please log in.", 401);

  const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
  if (!user) throw new AuthError("Account no longer exists.", 401);
  if (!user.isVerified) throw new AuthError("Please verify your email first.", 403);
  if (user.status === "SUSPENDED") throw new AuthError("This account has been suspended.", 403);

  return user;
}

/**
 * Like requireUser, but also enforces a minimum role. Roles rank
 * STAFF < ADMIN < OWNER, so requireRole(req, "ADMIN") allows ADMIN and
 * OWNER, but not STAFF.
 */
export async function requireRole(req: NextRequest, minRole: User["role"]): Promise<User> {
  const user = await requireUser(req);
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    throw new AuthError("You don't have permission to do this.", 403);
  }
  return user;
}
