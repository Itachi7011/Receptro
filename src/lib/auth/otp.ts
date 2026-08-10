import crypto from "crypto";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";

const OTP_SALT_ROUNDS = 10;

export function generateOtp(): string {
  // 6-digit numeric OTP, cryptographically random
  return crypto.randomInt(100000, 999999).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, OTP_SALT_ROUNDS);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + env.OTP_EXPIRES_IN_MINUTES * 60 * 1000);
}
