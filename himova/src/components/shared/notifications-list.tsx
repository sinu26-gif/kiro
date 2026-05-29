"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, CheckCheck, Package, Trophy, Gift, Boxes, Info } from "lucide-react";

import { markAllNotificationsRead } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/notifications";

const ICON: Record<string, typeof Bell> = {
  order: Package,
  stock: Boxes,
  leaderboard: Trophy,
  reward: Gift,
  marketing: Info,
  system: Info,
};

export function NotificationsList({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [pending, start] = useTransition();

  const hasUnread = notifications.some((n) => !n.readAt);

  function markAll() {
    start(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {hasUnread ? (
          <Button variant="outline" size="sm" onClick={markAll} disabled={pending}>
            <CheckCheck className="mr-1.5 h-4 w-4" aria-hidden />
            {t("markAllRead")}
          </Button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <Card className="border-dashed bg-card/60 p-10 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{t("empty")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = ICON[n.category] ?? Info;
            const inner = (
              <Card
                className={cn(
                  "flex items-start gap-3 p-3 transition-colors",
                  !n.readAt && "border-primary/30 bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    n.readAt ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium leading-tight">{n.title}</p>
                    {!n.readAt ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    ) : null}
                  </div>
                  {n.body ? (
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDate(n.createdAt)}
                  </p>
                </div>
              </Card>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
