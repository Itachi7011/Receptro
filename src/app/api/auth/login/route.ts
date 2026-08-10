import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, businesses } from "@/db/schema";
import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/auth/password";
import { attachSessionCookie } from "@/lib/auth/session";
import { fail, handleApiError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit by IP and by email to blunt both distributed and targeted
    // brute-force attempts.
    const ipLimit = checkRateLimit(`login-ip:${ip}`, 20, 15 * 60);
    if (!ipLimit.allowed) {
      return fail(`Too many attempts. Try again in ${ipLimit.resetInSeconds}s.`, 429);
    }

    const { email, password } = loginSchema.parse(await req.json());

    const emailLimit = checkRateLimit(`login-email:${email}`, 8, 15 * 60);
    if (!emailLimit.allowed) {
      return fail(`Too many attempts for this account. Try again in ${emailLimit.resetInSeconds}s.`, 429);
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Same generic error whether the email doesn't exist or the password is
    // wrong, so we don't leak which emails are registered.
    if (!user) return fail("Invalid email or password.", 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return fail("Invalid email or password.", 401);

    if (!user.isVerified) {
      return fail("Please verify your email before logging in.", 403);
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, user.businessId))
      .limit(1);

    const res = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          companyName: business?.name ?? "",
          role: user.role,
          theme: user.theme,
          locale: user.locale,
        },
      },
    });
    return attachSessionCookie(res, { id: user.id, email: user.email, role: user.role });
  } catch (err) {
    return handleApiError(err);
  }
}
