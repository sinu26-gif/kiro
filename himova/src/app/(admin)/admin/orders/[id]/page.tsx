import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { loadAdminOrderDetail, type OrderDetail } from "@/lib/orders";
import { formatPhoneForDisplay } from "@/lib/auth/phone";
import { formatNpr, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/orders/status-badge";

import { OrderManagePanel } from "./manage-panel";

export const metadata = { title: "Order" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["admin"]);
  const order = await loadAdminOrderDetail(params.id).catch(() => null);
  if (!order) notFound();
  return <View order={order} />;
}

function View({ order }: { order: OrderDetail }) {
  const t = useTranslations("adminOrders");
  const to = useTranslations("orders");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("title")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("orderNo")} #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("placedOn")}: {formatDate(order.placedAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Management controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("manageTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderManagePanel
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
            freeDelivery={order.freeDelivery}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Shopkeeper */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("customer")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {order.shop ? (
              <>
                <p className="font-medium">{order.shop.shopName}</p>
                <p className="text-muted-foreground">{order.shop.ownerName}</p>
                <p className="text-muted-foreground">
                  {t("phone")}: {formatPhoneForDisplay(order.shop.phone)}
                </p>
                {order.shop.address ? (
                  <p className="text-muted-foreground">
                    {t("address")}: {order.shop.address}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        {/* Payment / delivery summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("payment")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t("paymentMethod")} value={order.paymentMethod.toUpperCase()} />
            <Row
              label={t("payment")}
              value={order.paymentStatus === "paid" ? to("paid") : to("unpaid")}
            />
            {order.freeDelivery ? (
              <Badge variant="success">{to("freeDelivery")}</Badge>
            ) : null}
            {order.estimatedDeliveryAt ? (
              <Row label={to("eta")} value={formatDate(order.estimatedDeliveryAt)} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("items")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium">{it.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {it.variantName} · {it.label} ({it.sizes.join(", ")}) × {it.setQuantity}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatNpr(it.lineTotalPaisa)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-3">
            <span className="font-medium">{to("total")}</span>
            <span className="text-lg font-bold">{formatNpr(order.totalPaisa)}</span>
          </div>
        </CardContent>
      </Card>

      {order.notesToAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("noteFromShop")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{order.notesToAdmin}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
