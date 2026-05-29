import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AppNotification = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

/**
 * Recent notifications for the current authenticated user.
 */
export async function loadNotifications(limit = 15): Promise<AppNotification[]> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id, category, title, body, link, read_at, created_at")
    .eq("recipient_profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((n) => ({
    id: n.id as string,
    category: n.category as string,
    title: n.title as string,
    body: (n.body as string | null) ?? null,
    link: (n.link as string | null) ?? null,
    readAt: (n.read_at as string | null) ?? null,
    createdAt: n.created_at as string,
  }));
}

/**
 * Count of unread notifications for the current user.
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_profile_id", user.id)
    .is("read_at", null);

  return count ?? 0;
}
