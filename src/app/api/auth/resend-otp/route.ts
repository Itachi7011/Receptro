import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { resendOtpSchema } from "@/lib/validations/auth";
import { generateOtp, hashOtp, otpExpiryDate } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/email";
import { emailConfigured, env } from "@/lib/env";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RESEND_COOLDOWN_SECONDS = 45;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`resend-otp:${ip}`, 5, 15 * 60);
    if (!rl.allowed) {
      return fail(`Too many attempts. Try again in ${rl.resetInSeconds}s.`, 429);
    }

    const { email } = resendOtpSchema.parse(await req.json());

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    // Don't reveal whether the account exists.
    if (!user || user.isVerified) {
      return ok({ message: "If an account exists, a new code has been sent." });
    }

    if (user.otpLastSentAt) {
      const secondsSince = (Date.now() - user.otpLastSentAt.getTime()) / 1000;
      if (secondsSince < RESEND_COOLDOWN_SECONDS) {
        return fail(
          `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince)}s before requesting another code.`,
          429,
        );
      }
    }

    const otp = generateOtp();
    await db
      .update(users)
      .set({
        otpHash: await hashOtp(otp),
        otpExpiresAt: otpExpiryDate(),
        otpAttempts: 0,
        otpLastSentAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const emailResult = await sendOtpEmail(user.email, user.name, otp);

    return ok({
      message: "A new verification code has been sent.",
      emailDelivery: emailResult.delivered,
      ...(env.NODE_ENV !== "production" && !emailConfigured ? { devOtp: otp } : {}),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
