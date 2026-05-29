import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export type OrderStatus = "pending" | "packed" | "shipped" | "delivered" | "cancelled";

const VARIANT: Record<OrderStatus, "muted" | "secondary" | "warning" | "success" | "destructive"> = {
  pending: "warning",
  packed: "secondary",
  shipped: "secondary",
  delivered: "success",
  cancelled: "destructive",
};

const KEY: Record<OrderStatus, string> = {
  pending: "statusPending",
  packed: "statusPacked",
  shipped: "statusShipped",
  delivered: "statusDelivered",
  cancelled: "statusCancelled",
};

/**
 * Coloured order-status badge. Reads labels from the shop "orders" namespace
 * (admin pages share the same status labels).
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("orders");
  return <Badge variant={VARIANT[status]}>{t(KEY[status])}</Badge>;
}
