import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, businesses } from "@/db/schema";
import { verifyOtpSchema } from "@/lib/validations/auth";
import { verifyOtp } from "@/lib/auth/otp";
import { attachSessionCookie } from "@/lib/auth/session";
import { sendWelcomeEmail } from "@/lib/email";
import { fail, handleApiError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`verify-otp:${ip}`, 10, 15 * 60);
    if (!rl.allowed) {
      return fail(`Too many attempts. Try again in ${rl.resetInSeconds}s.`, 429);
    }

    const { email, otp } = verifyOtpSchema.parse(await req.json());

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) return fail("Invalid email or code.", 400);
    if (user.isVerified) return fail("This account is already verified. Please log in.", 400);
    if (!user.otpHash || !user.otpExpiresAt) return fail("No pending code. Request a new one.", 400);

    if (user.otpAttempts >= MAX_ATTEMPTS) {
      return fail("Too many incorrect attempts. Request a new code.", 429);
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return fail("This code has expired. Request a new one.", 400);
    }

    const valid = await verifyOtp(otp, user.otpHash);
    if (!valid) {
      await db
        .update(users)
        .set({ otpAttempts: user.otpAttempts + 1 })
        .where(eq(users.id, user.id));
      return fail(
        `Incorrect code. ${MAX_ATTEMPTS - (user.otpAttempts + 1)} attempt(s) remaining.`,
        400,
      );
    }

    await db
      .update(users)
      .set({
        isVerified: true,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, user.businessId))
      .limit(1);

    void sendWelcomeEmail(user.email, user.name, business?.name ?? "");

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
