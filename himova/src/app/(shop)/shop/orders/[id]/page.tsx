import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { loadShopOrderDetail, type OrderDetail } from "@/lib/orders";
import { formatNpr, formatDate } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/orders/status-badge";

export const metadata = { title: "Order" };

export default async function ShopOrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { placed?: string };
}) {
  await requireRole(["shopkeeper"]);
  const order = await loadShopOrderDetail(params.id).catch(() => null);
  if (!order) notFound();
  return <View order={order} justPlaced={searchParams?.placed === "1"} />;
}

function View({ order, justPlaced }: { order: OrderDetail; justPlaced: boolean }) {
  const t = useTranslations("orders");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/shop/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToOrders")}
      </Link>

      {justPlaced ? (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          <AlertDescription>{t("placedSuccess")}</AlertDescription>
        </Alert>
      ) : null}

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

      {/* Status tracker */}
      <StatusTracker status={order.status} />

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("items")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
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
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <Row label={t("total")} value={formatNpr(order.totalPaisa)} bold />
          <Row
            label={t("payment")}
            value={`${order.paymentMethod.toUpperCase()} · ${order.paymentStatus === "paid" ? t("paid") : t("unpaid")}`}
          />
          {order.estimatedDeliveryAt ? (
            <Row label={t("eta")} value={formatDate(order.estimatedDeliveryAt)} />
          ) : null}
          {order.freeDelivery ? (
            <div className="pt-1">
              <Badge variant="success">{t("freeDelivery")}</Badge>
            </div>
          ) : null}
          {order.notesToAdmin ? (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground">{t("noteToHimova")}</p>
              <p className="text-sm">{order.notesToAdmin}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "text-base font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}

function StatusTracker({ status }: { status: OrderDetail["status"] }) {
  const t = useTranslations("orders");
  if (status === "cancelled") return null;
  const steps = [
    { key: "pending", label: t("statusPending") },
    { key: "packed", label: t("statusPacked") },
    { key: "shipped", label: t("statusShipped") },
    { key: "delivered", label: t("statusDelivered") },
  ];
  const order = ["pending", "packed", "shipped", "delivered"];
  const currentIdx = order.indexOf(status);

  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const done = i <= currentIdx;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold " +
                  (done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
                }
              >
                {i + 1}
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground">{step.label}</span>
            </div>
            {i < steps.length - 1 ? (
              <span
                className={"mx-1 h-0.5 flex-1 rounded " + (i < currentIdx ? "bg-primary" : "bg-muted")}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
