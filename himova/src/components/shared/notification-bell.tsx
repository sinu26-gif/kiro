import Link from "next/link";
import { Bell } from "lucide-react";

import { getUnreadCount } from "@/lib/notifications";

/**
 * Notification bell with an unread-count badge. Links to the notifications
 * page for the given area (admin or shop). Server component — reads the
 * unread count on each render.
 */
export async function NotificationBell({ basePath }: { basePath: "/admin" | "/shop" }) {
  let unread = 0;
  try {
    unread = await getUnreadCount();
  } catch {
    unread = 0;
  }

  return (
    <Link
      href={`${basePath}/notifications`}
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
