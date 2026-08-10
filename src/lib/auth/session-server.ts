import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { verifySessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Like requireUser(), but for places that only have access to
 * next/headers cookies() instead of a NextRequest — mainly
 * generateMetadata(), which runs on the server before the page itself
 * renders. Returns null instead of throwing, since a page title falling
 * back to something generic is a fine outcome — the actual page component
 * still does its own proper auth check.
 */
export async function getServerSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
  return user ?? null;
}
