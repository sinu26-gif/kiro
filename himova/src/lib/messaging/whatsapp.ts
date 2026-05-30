import "server-only";

/**
 * WhatsApp Cloud API client (Meta Graph API).
 *
 * Reads WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN from the
 * environment at call time. All functions are best-effort: they never throw,
 * returning a result object so callers can log without breaking the flow.
 *
 * NOTE on the 24-hour window: free-form text messages are only delivered when
 * the recipient has messaged the business within the last 24h. Outside that
 * window WhatsApp requires a pre-approved template (see sendWhatsAppTemplate).
 */

const GRAPH_VERSION = "v21.0";

export type WhatsAppResult = { ok: true; id: string } | { ok: false; error: string };

export function isWhatsAppConfigured(): boolean {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!id || !token) return false;
  if (id.includes("placeholder") || token.includes("placeholder")) return false;
  return true;
}

/** Normalise a Nepali phone to digits-only E.164 (Graph API wants no leading +). */
export function toWhatsAppRecipient(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  if (digits.startsWith("977")) return digits;
  if (digits.length === 10 && digits.startsWith("9")) return `977${digits}`;
  return digits;
}

/** Send a plain text WhatsApp message (works within the 24h customer window). */
export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppResult> {
  if (!isWhatsAppConfigured()) return { ok: false, error: "WhatsApp not configured" };

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID as string;
  const token = process.env.WHATSAPP_ACCESS_TOKEN as string;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toWhatsAppRecipient(to),
        type: "text",
        text: { preview_url: true, body },
      }),
    });
    const data = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok) return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, id: data?.messages?.[0]?.id ?? "sent" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Send a pre-approved template message (works outside the 24h window).
 * bodyParams map to {{1}}, {{2}}, ... in the approved template body.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode = "en_US",
  bodyParams: string[] = [],
): Promise<WhatsAppResult> {
  if (!isWhatsAppConfigured()) return { ok: false, error: "WhatsApp not configured" };

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID as string;
  const token = process.env.WHATSAPP_ACCESS_TOKEN as string;

  const components =
    bodyParams.length > 0
      ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
      : [];

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWhatsAppRecipient(to),
        type: "template",
        template: { name: templateName, language: { code: languageCode }, components },
      }),
    });
    const data = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok) return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, id: data?.messages?.[0]?.id ?? "sent" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
