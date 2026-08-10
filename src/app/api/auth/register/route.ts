import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, businesses } from "@/db/schema";
import { registerSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";
import { generateOtp, hashOtp, otpExpiryDate } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/email";
import { emailConfigured, env } from "@/lib/env";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`register:${ip}`, 5, 15 * 60);
    if (!rl.allowed) {
      return fail(`Too many attempts. Try again in ${rl.resetInSeconds}s.`, 429);
    }

    const body = registerSchema.parse(await req.json());

    const [existing] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (existing?.isVerified) {
      return fail("An account with this email already exists. Please log in.", 409);
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const passwordHash = await hashPassword(body.password);

    let user;
    if (existing && !existing.isVerified) {
      // Re-registering before verifying: refresh their details + OTP. Also
      // refresh the business name in case they changed it.
      await db
        .update(businesses)
        .set({ name: body.companyName, updatedAt: new Date() })
        .where(eq(businesses.id, existing.businessId));

      [user] = await db
        .update(users)
        .set({
          name: body.name,
          phone: body.phone,
          passwordHash,
          otpHash,
          otpExpiresAt: otpExpiryDate(),
          otpAttempts: 0,
          otpLastSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
    } else {
      // New signup: create the business (tenant) and its first user (OWNER)
      // together.
      const businessId = randomUUID();
      await db.insert(businesses).values({
        id: businessId,
        name: body.companyName,
      });

      [user] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          businessId,
          name: body.name,
          email: body.email,
          phone: body.phone,
          passwordHash,
          role: "OWNER",
          isVerified: false,
          otpHash,
          otpExpiresAt: otpExpiryDate(),
          otpLastSentAt: new Date(),
        })
        .returning();
    }

    const emailResult = await sendOtpEmail(user.email, user.name, otp);

    return ok(
      {
        message: "Account created. Check your email for the verification code.",
        email: user.email,
        emailDelivery: emailResult.delivered,
        // Dev convenience only: surface the OTP in the API response when
        // SendGrid isn't configured, so you don't have to dig through logs
        // while building. Never happens once SENDGRID_API_KEY is set.
        ...(env.NODE_ENV !== "production" && !emailConfigured ? { devOtp: otp } : {}),
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
