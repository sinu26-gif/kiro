import Link from "next/link";
import { useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { loadAdminOrders, type OrderListRow } from "@/lib/orders";
import type { OrderStatus } from "@/components/orders/status-badge";
import { OrderStatusBadge } from "@/components/orders/status-badge";
import { formatNpr, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Orders" };

const STATUSES: OrderStatus[] = ["pending", "packed", "shipped", "delivered", "cancelled"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  await requireRole(["admin"]);
  const statusFilter = STATUSES.includes(searchParams?.status as OrderStatus)
    ? (searchParams?.status as OrderStatus)
    : undefined;

  let orders: OrderListRow[] = [];
  try {
    orders = await loadAdminOrders(statusFilter);
  } catch {
    orders = [];
  }
  return <View orders={orders} activeStatus={statusFilter} />;
}

function View({
  orders,
  activeStatus,
}: {
  orders: OrderListRow[];
  activeStatus?: OrderStatus;
}) {
  const t = useTranslations("adminOrders");
  const to = useTranslations("orders");

  const tabs: { key: string; label: string; href: string; active: boolean }[] = [
    { key: "all", label: t("filterAll"), href: "/admin/orders", active: !activeStatus },
    ...STATUSES.map((s) => ({
      key: s,
      label: to(
        s === "pending"
          ? "statusPending"
          : s === "packed"
            ? "statusPacked"
            : s === "shipped"
              ? "statusShipped"
              : s === "delivered"
                ? "statusDelivered"
                : "statusCancelled"
      ),
      href: `/admin/orders?status=${s}`,
      active: activeStatus === s,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (tab.active
                ? "border-primary bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-accent")
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed bg-card/60 p-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{t("empty")}</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("orderNo")}</th>
                  <th className="px-4 py-3 font-medium">{t("shop")}</th>
                  <th className="px-4 py-3 font-medium">{t("placedOn")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("total")}</th>
                  <th className="px-4 py-3 font-medium">{t("payment")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                        #{o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{o.shopName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(o.placedAt)}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatNpr(o.totalPaisa)}
                    </td>
                    <td className="px-4 py-3">
                      {o.paymentStatus === "paid" ? (
                        <Badge variant="success">{to("paid")}</Badge>
                      ) : (
                        <Badge variant="warning">{to("unpaid")}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
