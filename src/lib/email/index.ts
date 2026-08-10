import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import {
  otpVerificationTemplate,
  welcomeTemplate,
  passwordResetTemplate,
  paymentRecordedTemplate,
  teamInviteTemplate,
  overdueReminderTemplate,
} from "@/lib/email/templates";

export async function sendOtpEmail(to: string, name: string, otp: string) {
  const { subject, html } = otpVerificationTemplate(name, otp, env.OTP_EXPIRES_IN_MINUTES);
  return sendEmail(to, subject, html);
}

export async function sendWelcomeEmail(to: string, name: string, companyName: string) {
  const { subject, html } = welcomeTemplate(name, companyName);
  return sendEmail(to, subject, html);
}

export async function sendPasswordResetEmail(to: string, name: string, otp: string) {
  const { subject, html } = passwordResetTemplate(name, otp, env.OTP_EXPIRES_IN_MINUTES);
  return sendEmail(to, subject, html);
}

export async function sendPaymentRecordedEmail(
  to: string,
  dealerName: string,
  amount: number,
  invoiceNumber: string,
  balance: number,
) {
  const { subject, html } = paymentRecordedTemplate(dealerName, amount, invoiceNumber, balance);
  return sendEmail(to, subject, html);
}

export async function sendTeamInviteEmail(
  to: string,
  name: string,
  invitedByName: string,
  tempPassword: string,
) {
  const { subject, html } = teamInviteTemplate(name, invitedByName, tempPassword);
  return sendEmail(to, subject, html);
}

export async function sendOverdueReminderEmail(
  to: string,
  dealerName: string,
  invoiceNumber: string,
  balance: number,
  daysOverdue: number,
  businessName: string,
) {
  const { subject, html } = overdueReminderTemplate(dealerName, invoiceNumber, balance, daysOverdue, businessName);
  return sendEmail(to, subject, html);
}
