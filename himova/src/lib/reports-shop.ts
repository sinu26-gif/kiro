import "server-only";

import { getCurrentShopkeeperId } from "@/lib/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Shopkeeper reporting aggregates from their POS sales.
 */

export type ShopReport = {
  salesTodayPaisa: number;
  salesMonthPaisa: number;
  salesAllPaisa: number;
  piecesMonth: number;
  saleCountMonth: number;
  stockValuePaisa: number;
  bestProducts: { name: string; pieces: number; revenuePaisa: number }[];
  topCustomers: { name: string; phone: string | null; spentPaisa: number; visits: number }[];
};

type SaleRow = { id: string; total_paisa: number; created_at: string; customer_id: string | null };

type SaleItemRow = {
  quantity: number;
  line_total_paisa: number;
  sale_id: string;
  variant: { product: { name: string } | null } | null;
  custom_product: { name: string } | null;
};

export async function loadShopReport(): Promise<ShopReport> {
  const empty: ShopReport = {
    salesTodayPaisa: 0,
    salesMonthPaisa: 0,
    salesAllPaisa: 0,
    piecesMonth: 0,
    saleCountMonth: 0,
    stockValuePaisa: 0,
    bestProducts: [],
    topCustomers: [],
  };

  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return empty;
  const supabase = getSupabaseServerClient();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: salesData } = await supabase
    .from("pos_sales")
    .select("id, total_paisa, created_at, customer_id")
    .eq("shopkeeper_id", shopkeeperId)
    .order("created_at", { ascending: false });

  const sales = (salesData as unknown as SaleRow[]) ?? [];

  let salesTodayPaisa = 0;
  let salesMonthPaisa = 0;
  let salesAllPaisa = 0;
  let saleCountMonth = 0;
  const monthSaleIds: string[] = [];
  const customerSpend = new Map<string, { spentPaisa: number; visits: number }>();

  for (const s of sales) {
    salesAllPaisa += s.total_paisa;
    if (s.created_at >= startOfMonth) {
      salesMonthPaisa += s.total_paisa;
      saleCountMonth += 1;
      monthSaleIds.push(s.id);
      if (s.customer_id) {
        const cur = customerSpend.get(s.customer_id) ?? { spentPaisa: 0, visits: 0 };
        cur.spentPaisa += s.total_paisa;
        cur.visits += 1;
        customerSpend.set(s.customer_id, cur);
      }
    }
    if (s.created_at >= startOfDay) salesTodayPaisa += s.total_paisa;
  }

  // Best products + pieces this month.
  let piecesMonth = 0;
  const productMap = new Map<string, { pieces: number; revenuePaisa: number }>();
  if (monthSaleIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("pos_sale_items")
      .select(
        `
        quantity, line_total_paisa, sale_id,
        variant:product_variants ( product:products ( name ) ),
        custom_product:custom_products ( name )
      `
      )
      .in("sale_id", monthSaleIds);

    for (const it of (itemsData as unknown as SaleItemRow[]) ?? []) {
      piecesMonth += it.quantity;
      const name = it.variant?.product?.name ?? it.custom_product?.name ?? "—";
      const cur = productMap.get(name) ?? { pieces: 0, revenuePaisa: 0 };
      cur.pieces += it.quantity;
      cur.revenuePaisa += it.line_total_paisa;
      productMap.set(name, cur);
    }
  }
  const bestProducts = Array.from(productMap.entries())
    .map(([name, v]) => ({ name, pieces: v.pieces, revenuePaisa: v.revenuePaisa }))
    .sort((a, b) => b.pieces - a.pieces)
    .slice(0, 5);

  // Top customers this month (resolve names).
  let topCustomers: ShopReport["topCustomers"] = [];
  if (customerSpend.size > 0) {
    const ids = Array.from(customerSpend.keys());
    const { data: custData } = await supabase
      .from("shop_customers")
      .select("id, name, phone")
      .in("id", ids);
    const byId = new Map(
      (custData ?? []).map((c) => [c.id as string, c as { name: string | null; phone: string | null }])
    );
    topCustomers = ids
      .map((id) => {
        const c = byId.get(id);
        const spend = customerSpend.get(id)!;
        return {
          name: c?.name ?? "—",
          phone: c?.phone ?? null,
          spentPaisa: spend.spentPaisa,
          visits: spend.visits,
        };
      })
      .sort((a, b) => b.spentPaisa - a.spentPaisa)
      .slice(0, 5);
  }

  // Stock value = sum of pieces × product suggested retail.
  let stockValuePaisa = 0;
  const { data: stockData } = await supabase
    .from("shop_stock")
    .select(
      "quantity, variant:product_variants ( product:products ( suggested_retail_paisa ) )"
    )
    .eq("shopkeeper_id", shopkeeperId);
  for (const row of (stockData as unknown as {
    quantity: number;
    variant: { product: { suggested_retail_paisa: number | null } | null } | null;
  }[]) ?? []) {
    const price = row.variant?.product?.suggested_retail_paisa ?? 0;
    stockValuePaisa += price * row.quantity;
  }

  return {
    salesTodayPaisa,
    salesMonthPaisa,
    salesAllPaisa,
    piecesMonth,
    saleCountMonth,
    stockValuePaisa,
    bestProducts,
    topCustomers,
  };
}
