import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { signSessionToken, verifySessionToken, type SessionTokenPayload } from "@/lib/auth/jwt";

export const SESSION_COOKIE = "receptro_session";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60,
  };
}

export async function attachSessionCookie(
  res: NextResponse,
  user: { id: string; email: string; role: string },
): Promise<NextResponse> {
  const token = await signSessionToken({ userId: user.id, email: user.email, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}

/** Reads + verifies the session token from a request. Does NOT hit the DB. */
export async function getSessionFromRequest(
  req: NextRequest,
): Promise<SessionTokenPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
