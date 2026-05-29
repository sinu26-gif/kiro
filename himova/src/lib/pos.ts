import "server-only";

import { getCurrentShopkeeperId } from "@/lib/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POS read helpers. The POS sells individual size-pieces from the shopkeeper's
 * shop_stock (Himova products) plus any custom products they added themselves.
 */

export type PosSizeStock = {
  variantId: string;
  size: string;
  quantity: number;
};

export type PosProduct = {
  // For Himova products this is the variant id; custom products use their own id.
  key: string;
  kind: "himova" | "custom";
  productName: string;
  variantName: string | null;
  thumbnailUrl: string | null;
  suggestedPricePaisa: number;
  // Himova: available sizes with stock. Custom: single pseudo-size with stock.
  sizes: PosSizeStock[];
  customProductId?: string;
  customStock?: number;
};

type RawShopStock = {
  variant_id: string;
  size: string;
  quantity: number;
  variant: {
    variant_name: string;
    product: {
      id: string;
      name: string;
      suggested_retail_paisa: number | null;
      product_photos: Array<{ url: string; sort_order: number; variant_id: string | null }> | null;
    } | null;
  } | null;
};

type RawCustom = {
  id: string;
  name: string;
  photo_url: string | null;
  price_paisa: number;
  stock_qty: number;
};

/**
 * Build the POS product grid for the current shopkeeper: in-stock Himova
 * pieces grouped by variant, plus active custom products with stock.
 */
export async function loadPosProducts(): Promise<PosProduct[]> {
  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return [];
  const supabase = getSupabaseServerClient();

  const [stockRes, customRes] = await Promise.all([
    supabase
      .from("shop_stock")
      .select(
        `
        variant_id, size, quantity,
        variant:product_variants (
          variant_name,
          product:products ( id, name, suggested_retail_paisa, product_photos ( url, sort_order, variant_id ) )
        )
      `
      )
      .eq("shopkeeper_id", shopkeeperId)
      .gt("quantity", 0),
    supabase
      .from("custom_products")
      .select("id, name, photo_url, price_paisa, stock_qty")
      .eq("shopkeeper_id", shopkeeperId)
      .eq("status", "active")
      .gt("stock_qty", 0),
  ]);

  const byVariant = new Map<string, PosProduct>();
  for (const row of (stockRes.data as unknown as RawShopStock[]) ?? []) {
    const product = row.variant?.product;
    if (!product) continue;
    const key = row.variant_id;
    if (!byVariant.has(key)) {
      const photos = [...(product.product_photos ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      );
      // This tile is a specific variant, so prefer its photo, then a general one.
      const thumbnailUrl =
        photos.find((p) => p.variant_id === key)?.url ??
        photos.find((p) => !p.variant_id)?.url ??
        photos[0]?.url ??
        null;
      byVariant.set(key, {
        key,
        kind: "himova",
        productName: product.name,
        variantName: row.variant?.variant_name ?? null,
        thumbnailUrl,
        suggestedPricePaisa: product.suggested_retail_paisa ?? 0,
        sizes: [],
      });
    }
    byVariant.get(key)!.sizes.push({
      variantId: row.variant_id,
      size: row.size,
      quantity: row.quantity,
    });
  }

  const himova = Array.from(byVariant.values());
  himova.forEach((p) =>
    p.sizes.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
  );
  himova.sort((a, b) => a.productName.localeCompare(b.productName));

  const custom: PosProduct[] = ((customRes.data as unknown as RawCustom[]) ?? []).map((c) => ({
    key: `custom:${c.id}`,
    kind: "custom",
    productName: c.name,
    variantName: null,
    thumbnailUrl: c.photo_url,
    suggestedPricePaisa: c.price_paisa,
    sizes: [],
    customProductId: c.id,
    customStock: c.stock_qty,
  }));

  return [...himova, ...custom];
}

export type DailyClose = {
  date: string;
  totalSalesPaisa: number;
  saleCount: number;
  piecesSold: number;
  byMethodPaisa: Record<string, number>;
};

/**
 * Today's closing summary for the current shopkeeper.
 */
export async function loadTodayClose(): Promise<DailyClose> {
  const empty: DailyClose = {
    date: new Date().toISOString().slice(0, 10),
    totalSalesPaisa: 0,
    saleCount: 0,
    piecesSold: 0,
    byMethodPaisa: {},
  };
  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return empty;
  const supabase = getSupabaseServerClient();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startIso = start.toISOString();

  const { data: sales } = await supabase
    .from("pos_sales")
    .select("id, total_paisa")
    .eq("shopkeeper_id", shopkeeperId)
    .gte("created_at", startIso);

  const saleIds = (sales ?? []).map((s) => s.id as string);
  const totalSalesPaisa = (sales ?? []).reduce((sum, s) => sum + (s.total_paisa as number), 0);

  let piecesSold = 0;
  const byMethodPaisa: Record<string, number> = {};

  if (saleIds.length > 0) {
    const [itemsRes, paymentsRes] = await Promise.all([
      supabase.from("pos_sale_items").select("quantity, sale_id").in("sale_id", saleIds),
      supabase.from("pos_payments").select("method, amount_paisa, sale_id").in("sale_id", saleIds),
    ]);
    piecesSold = (itemsRes.data ?? []).reduce((sum, i) => sum + (i.quantity as number), 0);
    for (const p of paymentsRes.data ?? []) {
      const m = p.method as string;
      byMethodPaisa[m] = (byMethodPaisa[m] ?? 0) + (p.amount_paisa as number);
    }
  }

  return {
    date: empty.date,
    totalSalesPaisa,
    saleCount: saleIds.length,
    piecesSold,
    byMethodPaisa,
  };
}
