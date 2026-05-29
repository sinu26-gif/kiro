import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Warehouse stock read helpers for the admin stock dashboard.
 */

export type WarehouseRow = {
  setTypeId: string;
  productId: string;
  productName: string;
  variantName: string;
  label: string;
  sizes: string[];
  warehouseStock: number;
  reorderThreshold: number;
  isLow: boolean;
};

type RawSetType = {
  id: string;
  label: string;
  sizes: string[];
  warehouse_stock: number;
  reorder_threshold: number;
  variant: {
    variant_name: string;
    product: { id: string; name: string; status: string } | null;
  } | null;
};

/**
 * All set types across active products with their warehouse stock.
 * Sorted lowest-stock first so low items surface at the top.
 */
export async function loadWarehouseStock(): Promise<WarehouseRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("set_types")
    .select(
      `
      id, label, sizes, warehouse_stock, reorder_threshold,
      variant:product_variants (
        variant_name,
        product:products ( id, name, status )
      )
    `
    )
    .order("warehouse_stock", { ascending: true });

  if (error || !data) return [];

  const rows: WarehouseRow[] = [];
  for (const st of data as unknown as RawSetType[]) {
    const product = st.variant?.product;
    if (!product || product.status !== "active") continue;
    rows.push({
      setTypeId: st.id,
      productId: product.id,
      productName: product.name,
      variantName: st.variant?.variant_name ?? "—",
      label: st.label,
      sizes: st.sizes ?? [],
      warehouseStock: st.warehouse_stock,
      reorderThreshold: st.reorder_threshold,
      isLow: st.warehouse_stock <= st.reorder_threshold,
    });
  }
  return rows;
}

export type ShopStockRow = {
  productName: string;
  variantName: string;
  size: string;
  quantity: number;
};

/**
 * The current shopkeeper's shop stock, grouped-ready (sorted by product then size).
 */
export async function loadShopStock(shopkeeperId: string): Promise<ShopStockRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("shop_stock")
    .select(
      `
      size, quantity,
      variant:product_variants (
        variant_name,
        product:products ( name )
      )
    `
    )
    .eq("shopkeeper_id", shopkeeperId)
    .order("quantity", { ascending: true });

  if (error || !data) return [];

  type Raw = {
    size: string;
    quantity: number;
    variant: { variant_name: string; product: { name: string } | null } | null;
  };

  return (data as unknown as Raw[]).map((r) => ({
    productName: r.variant?.product?.name ?? "—",
    variantName: r.variant?.variant_name ?? "—",
    size: r.size,
    quantity: r.quantity,
  }));
}
