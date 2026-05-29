import { requireRole } from "@/lib/auth/session";
import { loadNotifications, type AppNotification } from "@/lib/notifications";
import { NotificationsList } from "@/components/shared/notifications-list";

export const metadata = { title: "Notifications" };

export default async function ShopNotificationsPage() {
  await requireRole(["shopkeeper"]);
  let notifications: AppNotification[] = [];
  try {
    notifications = await loadNotifications(30);
  } catch {
    notifications = [];
  }
  return <NotificationsList notifications={notifications} />;
}

export const dynamic = "force-dynamic";
