import { requireRole } from "@/lib/auth/session";
import { loadNotifications, type AppNotification } from "@/lib/notifications";
import { NotificationsList } from "@/components/shared/notifications-list";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  await requireRole(["admin"]);
  let notifications: AppNotification[] = [];
  try {
    notifications = await loadNotifications(30);
  } catch {
    notifications = [];
  }
  return <NotificationsList notifications={notifications} />;
}
