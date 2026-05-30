import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendWhatsAppText, isWhatsAppConfigured } from "./whatsapp";
import { sendEmail, isEmailConfigured } from "./email";

export type NotificationCategory =
  | "order"
  | "stock"
  | "leaderboard"
  | "reward"
  | "system"
  | "marketing";

export type NotifyParams = {
  /** Profile ids that should receive this notification. */
  recipientProfileIds: string[];
  category: NotificationCategory;
  title: string;
  body: string;
  link?: string;
  /** Also deliver via WhatsApp text (default true). */
  whatsapp?: boolean;
  /** Also deliver via email to these addresses (optional). */
  emails?: string[];
};

/**
 * Central notification dispatcher.
 *
 * 1. Writes one in-app notification row per recipient (service role, bypasses RLS).
 * 2. Best-effort WhatsApp text to each recipient's phone (shopkeepers) and to
 *    ADMIN_WHATSAPP_PHONE for admin recipients (those with no shopkeeper row).
 * 3. Best-effort email to any explicitly supplied addresses.
 *
 * Never throws — external delivery failures are logged and swallowed so they
 * cannot break the originating action (placing an order, etc.).
 */
export async function notifyProfiles(params: NotifyParams): Promise<void> {
  const { recipientProfileIds, category, title, body, link, whatsapp = true, emails } = params;
  if (recipientProfileIds.length === 0 && (!emails || emails.length === 0)) return;

  const admin = getSupabaseAdminClient();

  // 1. In-app notification rows.
  if (recipientProfileIds.length > 0) {
    const rows = recipientProfileIds.map((id) => ({
      recipient_profile_id: id,
      category,
      title,
      body,
      link: link ?? null,
    }));
    const { error } = await admin.from("notifications").insert(rows);
    if (error) console.error("[notify] in-app insert failed:", error.message);
  }

  // 2. WhatsApp text — best effort.
  if (whatsapp && isWhatsAppConfigured() && recipientProfileIds.length > 0) {
    try {
      const { data: shops } = await admin
        .from("shopkeepers")
        .select("profile_id, phone")
        .in("profile_id", recipientProfileIds);

      const phoneByProfile = new Map<string, string>();
      for (const s of shops ?? []) {
        if (s.profile_id && s.phone) phoneByProfile.set(s.profile_id as string, s.phone as string);
      }

      const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
      const recipients = new Set<string>();
      let usedAdminPhone = false;

      for (const id of recipientProfileIds) {
        const phone = phoneByProfile.get(id);
        if (phone) {
          recipients.add(phone);
        } else if (adminPhone && !usedAdminPhone) {
          // Profile with no shopkeeper row -> treat as admin recipient.
          recipients.add(adminPhone);
          usedAdminPhone = true;
        }
      }

      const text = link
        ? `${title}\n${body}\n${process.env.NEXT_PUBLIC_APP_URL ?? ""}${link}`
        : `${title}\n${body}`;

      await Promise.all(
        Array.from(recipients).map(async (phone) => {
          const r = await sendWhatsAppText(phone, text);
          if (!r.ok) console.error(`[notify] WhatsApp to ${phone} failed:`, r.error);
        }),
      );
    } catch (e) {
      console.error("[notify] WhatsApp dispatch error:", e);
    }
  }

  // 3. Email — best effort, only when explicit addresses are given.
  if (emails && emails.length > 0 && isEmailConfigured()) {
    try {
      const html = `<h2>${title}</h2><p>${body}</p>${
        link ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}${link}">Open Himova</a></p>` : ""
      }`;
      await sendEmail({ to: emails, subject: `Himova — ${title}`, html });
    } catch (e) {
      console.error("[notify] email dispatch error:", e);
    }
  }
}
