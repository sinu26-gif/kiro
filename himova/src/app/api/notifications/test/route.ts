import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/messaging/whatsapp";

/**
 * POST /api/notifications/test
 * Body: { phone: string, message?: string }
 *
 * Admin-only. Sends a test WhatsApp text to verify the integration end-to-end.
 * Note: outside the recipient's 24h window WhatsApp requires an approved
 * template; for a quick test, message your business number first, then call this.
 */
export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: "WhatsApp not configured" }, { status: 400 });
  }

  const { phone, message } = (await request.json().catch(() => ({}))) as {
    phone?: string;
    message?: string;
  };
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  const result = await sendWhatsAppText(
    phone,
    message ?? "Hello from Himova! Your WhatsApp notifications are working. 🎉",
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, messageId: result.id });
}
