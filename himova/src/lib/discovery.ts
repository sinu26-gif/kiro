import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentShopkeeperId, loadCardsByIds, type CatalogProductCard } from "@/lib/catalog";

/**
 * Discovery feeds for the shopkeeper home + dedicated pages.
 *
 * - New arrivals: newest active products (department-filtered by loadCardsByIds).
 * - Best sellers: products with the most retail (POS) sales across ALL
 *   shopkeepers — the platform-wide top movers.
 * - Recommended: products THIS shopkeeper sells the most to their own
 *   customers (their own POS), so they know what to re-order. Products that are
 *   also platform best sellers naturally rank high here too.
 * - Previous orders: products this shopkeeper has ordered from Himova before.
 *
 * All return per-piece-priced, department-filtered CatalogProductCard[].
 */

type SaleItemRow = {
  quantity: number;
  variant: { product_id: string } | null;
};

/** New arrivals: newest active products. */
export async function loadNewArrivals(limit = 8): Promise<CatalogProductCard[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit * 3); // over-fetch; department filter happens in loadCardsByIds
  const ids = (data ?? []).map((r) => r.id as string);
  const cards = await loadCardsByIds(ids);
  return cards.slice(0, limit);
}

/** Platform-wide best sellers by total POS quantity across all shopkeepers. */
export async function loadBestSellers(limit = 8): Promise<CatalogProductCard[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("pos_sale_items")
    .select("quantity, variant:product_variants ( product_id )")
    .not("variant_id", "is", null);

  const totals = new Map<string, number>();
  for (const row of (data as unknown as SaleItemRow[]) ?? []) {
    const pid = row.variant?.product_id;
    if (!pid) continue;
    totals.set(pid, (totals.get(pid) ?? 0) + (row.quantity ?? 0));
  }
  const ids = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([pid]) => pid)
    .slice(0, limit * 3);
  const cards = await loadCardsByIds(ids);
  return cards.slice(0, limit);
}

/** This shopkeeper's own top-selling products (from their POS). */
export async function loadRecommended(limit = 8): Promise<CatalogProductCard[]> {
  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return [];
  const supabase = getSupabaseServerClient();

  const { data: sales } = await supabase
    .from("pos_sales")
    .select("id")
    .eq("shopkeeper_id", shopkeeperId);
  const saleIds = (sales ?? []).map((s) => s.id as string);
  if (saleIds.length === 0) return [];

  const { data } = await supabase
    .from("pos_sale_items")
    .select("quantity, variant:product_variants ( product_id )")
    .in("sale_id", saleIds)
    .not("variant_id", "is", null);

  const totals = new Map<string, number>();
  for (const row of (data as unknown as SaleItemRow[]) ?? []) {
    const pid = row.variant?.product_id;
    if (!pid) continue;
    totals.set(pid, (totals.get(pid) ?? 0) + (row.quantity ?? 0));
  }
  const ids = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([pid]) => pid)
    .slice(0, limit * 3);
  const cards = await loadCardsByIds(ids);
  return cards.slice(0, limit);
}

type PrevOrderRow = {
  created_at: string;
  set_type: { variant: { product_id: string } | null } | null;
};

/** Products this shopkeeper has previously ordered from Himova (most recent first). */
export async function loadPreviousOrderProducts(limit = 8): Promise<CatalogProductCard[]> {
  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return [];
  const supabase = getSupabaseServerClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .eq("shopkeeper_id", shopkeeperId)
    .order("placed_at", { ascending: false });
  const orderIds = (orders ?? []).map((o) => o.id as string);
  if (orderIds.length === 0) return [];

  const { data } = await supabase
    .from("order_items")
    .select("created_at, set_type:set_types ( variant:product_variants ( product_id ) )")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false });

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const row of (data as unknown as PrevOrderRow[]) ?? []) {
    const pid = row.set_type?.variant?.product_id;
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    ids.push(pid);
  }
  const cards = await loadCardsByIds(ids.slice(0, limit * 3));
  return cards.slice(0, limit);
}
