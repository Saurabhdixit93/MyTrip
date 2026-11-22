import "server-only";
import { createTransport, type Transporter } from "nodemailer";
import { env } from "@/lib/env";

/** SMTP settings for Nodemailer (port 465 = implicit TLS, otherwise STARTTLS). */
export const smtpServer = {
  host: env.SMTP_HOST ?? "localhost",
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER ?? "", pass: env.SMTP_PASSWORD ?? "" },
};

let transporter: Transporter | null = null;
function transport() {
  transporter ??= createTransport(smtpServer);
  return transporter;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** Sends the magic link over SMTP (Nodemailer), or prints it to the console when SMTP isn't configured in dev. */
export async function sendMagicLink({ identifier, url }: { identifier: string; url: string }) {
  if (!env.SMTP_HOST) {
    console.info(`\n🔐 MyTrip magic link for ${identifier}:\n${url}\n`);
    return;
  }
  const host = escapeHtml(new URL(url).host);
  const safeUrl = escapeHtml(url);
  const result = await transport().sendMail({
    from: env.EMAIL_FROM,
    to: identifier,
    subject: "Your MyTrip sign-in link",
    text: `Sign in to MyTrip:\n${url}\n\nThis link expires in 24 hours. If you didn't request it, you can ignore this email.`,
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0F172A">
  <h1 style="color:#0F766E;font-size:22px;margin:0 0 12px">Sign in to MyTrip</h1>
  <p>Tap the button below to sign in on <strong>${host}</strong>.</p>
  <p style="margin:24px 0"><a href="${safeUrl}" style="display:inline-block;background:#0F766E;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Sign in to MyTrip</a></p>
  <p style="color:#64748B;font-size:13px">This link expires in 24 hours. If you didn't request it, you can ignore this email.</p>
  <p style="color:#94A3B8;font-size:12px">MyTrip never asks for your UPI PIN or bank passwords.</p>
</div>`,
  });
  const failed = [...(result.rejected ?? []), ...(result.pending ?? [])].filter(Boolean);
  if (failed.length) throw new Error(`Email could not be sent to ${failed.join(", ")}`);
}

/** Checks the SMTP connection + login without sending anything. */
export async function verifySmtp() {
  return transport().verify();
}
