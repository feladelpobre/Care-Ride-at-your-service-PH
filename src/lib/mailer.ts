import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Email notifications over SMTP (e.g. a Gmail account with an app password).
 * Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in Vercel.
 * Without them, sending is skipped (the booking still succeeds).
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: Transporter | null = null;
function getTransport(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export type Mail = { to: string; subject: string; text: string; html: string };

/** Returns true when the email was handed to the mail server. Never throws. */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!isMailConfigured()) return false;
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM ?? `Care Ride at your service-PH <${process.env.SMTP_USER}>`,
      ...mail,
    });
    return true;
  } catch (err) {
    // Log the error type and SMTP code only, never the address, password or message body
    const e = err as { name?: string; code?: string; responseCode?: number; command?: string };
    console.error("mail: send failed", e?.name ?? "unknown", e?.code ?? "-", e?.responseCode ?? "-", e?.command ?? "-");
    return false;
  }
}
