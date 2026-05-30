import "server-only";

/**
 * Email delivery via Resend.
 *
 * Reads RESEND_API_KEY from the environment at call time. No-ops gracefully
 * when unconfigured so the rest of the app keeps working without email.
 */

export type EmailResult = { ok: true; id: string } | { ok: false; error: string };

const DEFAULT_FROM = "Himova <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  if (key.includes("placeholder")) return false;
  return true;
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<EmailResult> {
  if (!isEmailConfigured()) return { ok: false, error: "Email not configured" };
  const key = process.env.RESEND_API_KEY as string;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: params.from ?? process.env.EMAIL_FROM ?? DEFAULT_FROM,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
    return { ok: true, id: data?.id ?? "sent" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
