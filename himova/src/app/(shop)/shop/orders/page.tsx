import Link from "next/link";
import { useTranslations } from "next-intl";
import { Package } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { loadShopOrders, type OrderListRow } from "@/lib/orders";
import { formatNpr, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/orders/status-badge";

export const metadata = { title: "Orders" };

export default async function ShopOrdersPage() {
  await requireRole(["shopkeeper"]);
  let orders: OrderListRow[] = [];
  try {
    orders = await loadShopOrders();
  } catch {
    orders = [];
  }
  return <ShopOrdersView orders={orders} />;
}

function ShopOrdersView({ orders }: { orders: OrderListRow[] }) {
  const t = useTranslations("orders");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed bg-card/60 p-10 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">{t("empty")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/shop/catalog">{t("browseCatalog")}</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/shop/orders/${o.id}`} className="block">
              <Card className="transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {t("orderNo")} #{o.id.slice(0, 8)}
                      </span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(o.placedAt)} · {o.itemCount} {t("items")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatNpr(o.totalPaisa)}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.paymentStatus === "paid" ? t("paid") : t("unpaid")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
