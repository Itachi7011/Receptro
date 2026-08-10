import sgMail from "@sendgrid/mail";
import { env, emailConfigured } from "@/lib/env";

let configured = false;
function ensureConfigured() {
  if (!configured && emailConfigured) {
    sgMail.setApiKey(env.SENDGRID_API_KEY!);
    configured = true;
  }
}

export interface SendEmailResult {
  success: boolean;
  delivered: "sendgrid" | "console";
  error?: string;
}

/**
 * Sends an email via SendGrid. If SendGrid isn't configured (no API key /
 * plan currently inactive) or the send fails, it falls back to logging the
 * full email to the console instead of throwing — so auth flows like OTP
 * verification keep working end-to-end in development.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  if (!emailConfigured) {
    logEmailToConsole(to, subject, html, "SendGrid not configured");
    return { success: true, delivered: "console" };
  }

  try {
    ensureConfigured();
    await sgMail.send({
      to,
      from: env.SENDGRID_FROM_EMAIL!,
      subject,
      html,
    });
    return { success: true, delivered: "sendgrid" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown SendGrid error";
    logEmailToConsole(to, subject, html, `SendGrid send failed: ${message}`);
    return { success: true, delivered: "console", error: message };
  }
}

function logEmailToConsole(to: string, subject: string, html: string, reason: string) {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // eslint-disable-next-line no-console
  console.log(
    [
      "",
      "========================= EMAIL (dev fallback) =========================",
      `Reason:  ${reason}`,
      `To:      ${to}`,
      `Subject: ${subject}`,
      `Body:    ${plain}`,
      "==========================================================================",
      "",
    ].join("\n"),
  );
}
