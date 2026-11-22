import "server-only";
import { env } from "@/lib/env";

/** Sends the magic link through Resend, or prints it to the console in local dev. */
export async function sendMagicLink({ identifier, url }: { identifier: string; url: string }) {
  if (!env.AUTH_RESEND_KEY) {
    console.info(`\n🔐 MyTrip magic link for ${identifier}:\n${url}\n`);
    return;
  }
  const host = new URL(url).host;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.AUTH_RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: identifier,
      subject: "Your MyTrip sign-in link",
      text: `Sign in to MyTrip:\n${url}\n\nThis link expires in 24 hours. If you didn't request it, you can ignore this email.`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
  <h1 style="color:#0F766E;font-size:22px">Sign in to MyTrip</h1>
  <p>Tap the button below to sign in on <strong>${host}</strong>.</p>
  <p><a href="${url}" style="display:inline-block;background:#0F766E;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Sign in</a></p>
  <p style="color:#64748B;font-size:13px">This link expires in 24 hours. If you didn't request it, you can ignore this email.</p>
</div>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}
