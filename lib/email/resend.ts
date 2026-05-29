import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getResendFromEmail(): string | null {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return from || null;
}

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const client = getResendClient();
  const from = getResendFromEmail();
  if (!client) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }
  if (!from) {
    return { ok: false, error: "RESEND_FROM_EMAIL is not configured" };
  }

  const { data, error } = await client.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, error: "Resend did not return a message id" };
  }
  return { ok: true, messageId: data.id };
}
