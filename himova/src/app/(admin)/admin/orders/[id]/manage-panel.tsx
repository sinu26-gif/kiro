"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Check, PackageCheck, Truck, Wallet } from "lucide-react";

import {
  setFreeDelivery,
  setOrderPayment,
  updateOrderStatus,
  type PlaceOrderState,
} from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/components/orders/status-badge";

/**
 * Admin controls to advance an order's status, toggle payment, and toggle
 * free delivery. Each button calls a server action then refreshes the page.
 */
export function OrderManagePanel({
  orderId,
  status,
  paymentStatus,
  freeDelivery,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid";
  freeDelivery: boolean;
}) {
  const t = useTranslations("adminOrders");
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: (p: PlaceOrderState | null, fd: FormData) => Promise<PlaceOrderState>, fields: Record<string, string>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    start(async () => {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
      await fn(null, fd);
      router.refresh();
    });
  }

  const cancelled = status === "cancelled";
  const delivered = status === "delivered";

  return (
    <div className="space-y-4">
      {/* Status progression */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={status === "pending" ? "default" : "outline"}
          disabled={pending || cancelled || status !== "pending"}
          onClick={() => run(updateOrderStatus, { orderId, status: "packed" })}
        >
          <PackageCheck className="mr-1.5 h-4 w-4" aria-hidden />
          {t("markPacked")}
        </Button>
        <Button
          size="sm"
          variant={status === "packed" ? "default" : "outline"}
          disabled={pending || cancelled || status !== "packed"}
          onClick={() => run(updateOrderStatus, { orderId, status: "shipped" })}
        >
          <Truck className="mr-1.5 h-4 w-4" aria-hidden />
          {t("markShipped")}
        </Button>
        <Button
          size="sm"
          variant={status === "shipped" ? "default" : "outline"}
          disabled={pending || cancelled || status !== "shipped"}
          onClick={() => run(updateOrderStatus, { orderId, status: "delivered" })}
        >
          <Check className="mr-1.5 h-4 w-4" aria-hidden />
          {t("markDelivered")}
        </Button>
      </div>

      {/* Payment + delivery + cancel */}
      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(setOrderPayment, {
              orderId,
              paymentStatus: paymentStatus === "paid" ? "unpaid" : "paid",
            })
          }
        >
          <Wallet className="mr-1.5 h-4 w-4" aria-hidden />
          {paymentStatus === "paid" ? t("markUnpaid") : t("markPaid")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(setFreeDelivery, {
              orderId,
              freeDelivery: freeDelivery ? "false" : "true",
            })
          }
        >
          {freeDelivery ? t("disableFreeDelivery") : t("enableFreeDelivery")}
        </Button>
        {!cancelled && !delivered ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() =>
              run(updateOrderStatus, { orderId, status: "cancelled" }, t("confirmCancel"))
            }
          >
            <Ban className="mr-1.5 h-4 w-4" aria-hidden />
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
