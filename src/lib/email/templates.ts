import { env } from "@/lib/env";

export function otpVerificationTemplate(name: string, otp: string, minutes: number) {
  return {
    subject: `Verify your ${env.APP_NAME} account`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #12283f;">Verify your email</h2>
        <p>Hi ${name},</p>
        <p>Use the code below to verify your ${env.APP_NAME} account:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 24px 0; color: #0f6d5c;">${otp}</div>
        <p style="color: #b3261e;">This code expires in ${minutes} minutes. Do not share it with anyone.</p>
        <p>If you didn't request this, you can ignore this email.</p>
        <p>— The ${env.APP_NAME} team</p>
      </div>
    `,
  };
}

export function welcomeTemplate(name: string, companyName: string) {
  return {
    subject: `Welcome to ${env.APP_NAME}, ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #12283f;">Welcome, ${name} 👋</h2>
        <p>Your ${env.APP_NAME} account for <strong>${companyName}</strong> is verified and ready.</p>
        <p>You can now start adding dealers, invoices, and tracking collections.</p>
        <p><a href="${env.APP_URL}/login" style="color: #0f6d5c;">Log in to your dashboard</a></p>
        <p>— The ${env.APP_NAME} team</p>
      </div>
    `,
  };
}

export function passwordResetTemplate(name: string, otp: string, minutes: number) {
  return {
    subject: `Reset your ${env.APP_NAME} password`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #12283f;">Reset your password</h2>
        <p>Hi ${name},</p>
        <p>Use the code below to reset your password:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 24px 0; color: #0f6d5c;">${otp}</div>
        <p style="color: #b3261e;">This code expires in ${minutes} minutes. If you didn't request this, ignore this email.</p>
        <p>— The ${env.APP_NAME} team</p>
      </div>
    `,
  };
}

export function teamInviteTemplate(name: string, invitedByName: string, tempPassword: string) {
  return {
    subject: `You've been added to ${env.APP_NAME}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #12283f;">Welcome to the team</h2>
        <p>Hi ${name},</p>
        <p>${invitedByName} added you to their ${env.APP_NAME} account. Here's how to log in:</p>
        <p><strong>Temporary password:</strong> <span style="font-family: monospace; font-size: 16px;">${tempPassword}</span></p>
        <p>We'd recommend changing this after your first login.</p>
        <p><a href="${env.APP_URL}/login" style="color: #0f6d5c;">Log in to Receptro</a></p>
        <p>— The ${env.APP_NAME} team</p>
      </div>
    `,
  };
}

export function overdueReminderTemplate(
  dealerName: string,
  invoiceNumber: string,
  balance: number,
  daysOverdue: number,
  businessName: string,
) {
  return {
    subject: `Payment reminder: Invoice ${invoiceNumber} — ${daysOverdue} day(s) overdue`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #a63f2c;">Payment reminder</h2>
        <p>Dear ${dealerName},</p>
        <p>This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> has an outstanding
        balance of <strong>₹${balance.toLocaleString("en-IN")}</strong>, now <strong>${daysOverdue} day(s)</strong> past due.</p>
        <p>Please arrange payment at your earliest convenience. If you've already paid, kindly disregard this message.</p>
        <p>— ${businessName}</p>
      </div>
    `,
  };
}

export function paymentRecordedTemplate(
  dealerName: string,
  amount: number,
  invoiceNumber: string,
  balance: number,
) {
  return {
    subject: `Payment recorded — Invoice ${invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2430; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f6d5c;">Payment recorded</h2>
        <p>A payment of <strong>₹${amount.toLocaleString("en-IN")}</strong> was recorded for <strong>${dealerName}</strong> against invoice <strong>${invoiceNumber}</strong>.</p>
        <p>Remaining balance on this invoice: <strong>₹${balance.toLocaleString("en-IN")}</strong></p>
        <p>— ${env.APP_NAME}</p>
      </div>
    `,
  };
}
