import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Admin reporting aggregates. Computed in the server with lightweight queries
 * (no heavy SQL views yet) — fine at early scale, easy to optimise later.
 */

export type AdminReport = {
  revenueTodayPaisa: number;
  revenueMonthPaisa: number;
  revenueAllPaisa: number;
  ordersThisMonth: number;
  ordersByStatus: Record<string, number>;
  topProducts: { name: string; sets: number; revenuePaisa: number }[];
  topShopkeepers: { name: string; revenuePaisa: number; orders: number }[];
  outstanding: { id: string; shopName: string; totalPaisa: number; status: string }[];
  outstandingTotalPaisa: number;
};

type OrderRow = {
  id: string;
  status: string;
  total_paisa: number;
  payment_status: string;
  placed_at: string;
  shopkeeper: { shop_name: string } | null;
};

type ItemRow = {
  set_quantity: number;
  line_total_paisa: number;
  order: { status: string } | null;
  set_type: {
    variant: { product: { name: string } | null } | null;
  } | null;
};

const COUNTED_STATUSES = ["packed", "shipped", "delivered"];

export async function loadAdminReport(): Promise<AdminReport> {
  const supabase = getSupabaseServerClient();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: ordersData } = await supabase
    .from("orders")
    .select(
      "id, status, total_paisa, payment_status, placed_at, shopkeeper:shopkeepers(shop_name)"
    )
    .order("placed_at", { ascending: false });

  const orders = (ordersData as unknown as OrderRow[]) ?? [];

  let revenueTodayPaisa = 0;
  let revenueMonthPaisa = 0;
  let revenueAllPaisa = 0;
  let ordersThisMonth = 0;
  const ordersByStatus: Record<string, number> = {};
  const shopMap = new Map<string, { revenuePaisa: number; orders: number }>();
  const outstanding: AdminReport["outstanding"] = [];
  let outstandingTotalPaisa = 0;

  for (const o of orders) {
    ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;

    const counts = COUNTED_STATUSES.includes(o.status);
    if (counts) {
      revenueAllPaisa += o.total_paisa;
      if (o.placed_at >= startOfMonth) revenueMonthPaisa += o.total_paisa;
      if (o.placed_at >= startOfDay) revenueTodayPaisa += o.total_paisa;

      const name = o.shopkeeper?.shop_name ?? "—";
      const cur = shopMap.get(name) ?? { revenuePaisa: 0, orders: 0 };
      cur.revenuePaisa += o.total_paisa;
      cur.orders += 1;
      shopMap.set(name, cur);
    }

    if (o.placed_at >= startOfMonth && o.status !== "cancelled") ordersThisMonth += 1;

    // Outstanding = shipped/delivered but still unpaid.
    if (
      (o.status === "shipped" || o.status === "delivered") &&
      o.payment_status === "unpaid"
    ) {
      outstanding.push({
        id: o.id,
        shopName: o.shopkeeper?.shop_name ?? "—",
        totalPaisa: o.total_paisa,
        status: o.status,
      });
      outstandingTotalPaisa += o.total_paisa;
    }
  }

  const topShopkeepers = Array.from(shopMap.entries())
    .map(([name, v]) => ({ name, revenuePaisa: v.revenuePaisa, orders: v.orders }))
    .sort((a, b) => b.revenuePaisa - a.revenuePaisa)
    .slice(0, 5);

  // Top products from order_items on counted orders.
  const { data: itemsData } = await supabase
    .from("order_items")
    .select(
      `
      set_quantity, line_total_paisa,
      order:orders ( status ),
      set_type:set_types ( variant:product_variants ( product:products ( name ) ) )
    `
    );

  const items = (itemsData as unknown as ItemRow[]) ?? [];
  const productMap = new Map<string, { sets: number; revenuePaisa: number }>();
  for (const it of items) {
    if (!it.order || !COUNTED_STATUSES.includes(it.order.status)) continue;
    const name = it.set_type?.variant?.product?.name ?? "—";
    const cur = productMap.get(name) ?? { sets: 0, revenuePaisa: 0 };
    cur.sets += it.set_quantity;
    cur.revenuePaisa += it.line_total_paisa;
    productMap.set(name, cur);
  }
  const topProducts = Array.from(productMap.entries())
    .map(([name, v]) => ({ name, sets: v.sets, revenuePaisa: v.revenuePaisa }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 5);

  return {
    revenueTodayPaisa,
    revenueMonthPaisa,
    revenueAllPaisa,
    ordersThisMonth,
    ordersByStatus,
    topProducts,
    topShopkeepers,
    outstanding: outstanding.slice(0, 10),
    outstandingTotalPaisa,
  };
}
