import "server-only";

import { getCurrentShopkeeperId } from "@/lib/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Cart read helpers. Pricing mirrors the catalog logic so the cart and the
 * product page always agree on the shopkeeper's effective price.
 */

export type CartLine = {
  cartItemId: string;
  setTypeId: string;
  productId: string;
  productName: string;
  variantName: string;
  label: string;
  sizes: string[];
  thumbnailUrl: string | null;
  quantity: number;
  unitPricePaisa: number;
  basePricePaisa: number;
  priceNote: string | null;
  warehouseStock: number;
  lineTotalPaisa: number;
};

export type CartSummary = {
  lines: CartLine[];
  totalSets: number;
  subtotalPaisa: number;
};

type RawCartRow = {
  id: string;
  quantity: number;
  set_type: {
    id: string;
    label: string;
    sizes: string[];
    price_paisa: number;
    warehouse_stock: number;
    variant: {
      id: string;
      variant_name: string;
      product: {
        id: string;
        name: string;
        status: string;
        product_photos: Array<{ url: string; sort_order: number; variant_id: string | null }> | null;
      } | null;
    } | null;
  } | null;
};

export async function loadCart(): Promise<CartSummary> {
  const empty: CartSummary = { lines: [], totalSets: 0, subtotalPaisa: 0 };
  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return empty;

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `
      id, quantity,
      set_type:set_types (
        id, label, sizes, price_paisa, warehouse_stock,
        variant:product_variants (
          id, variant_name,
          product:products (
            id, name, status,
            product_photos:product_photos ( url, sort_order, variant_id )
          )
        )
      )
    `
    )
    .eq("shopkeeper_id", shopkeeperId)
    .order("created_at", { ascending: true });

  if (error || !data) return empty;

  // Pricing overrides for this shopkeeper.
  const { data: pricingRows } = await supabase
    .from("shopkeeper_pricing")
    .select("set_type_id, override_paisa, discount_percent, note")
    .eq("shopkeeper_id", shopkeeperId);
  const pricing = new Map(
    (pricingRows ?? []).map((r) => [
      r.set_type_id as string,
      r as { override_paisa: number | null; discount_percent: number | null; note: string | null },
    ])
  );

  const lines: CartLine[] = [];
  for (const row of data as unknown as RawCartRow[]) {
    const st = row.set_type;
    if (!st || !st.variant || !st.variant.product) continue;
    if (st.variant.product.status !== "active") continue;

    const override = pricing.get(st.id);
    let unit = st.price_paisa;
    let note: string | null = null;
    if (override?.override_paisa != null) {
      unit = override.override_paisa;
      note = override.note ?? "Your price";
    } else if (override?.discount_percent != null) {
      unit = Math.round(st.price_paisa * (1 - override.discount_percent / 100));
      note = override.note ?? `${override.discount_percent}% off`;
    }

    const photos = [...(st.variant.product.product_photos ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    // Prefer a photo for this line's variant, then a general product photo.
    const variantId = st.variant.id;
    const thumbnailUrl =
      photos.find((p) => p.variant_id === variantId)?.url ??
      photos.find((p) => !p.variant_id)?.url ??
      photos[0]?.url ??
      null;

    lines.push({
      cartItemId: row.id,
      setTypeId: st.id,
      productId: st.variant.product.id,
      productName: st.variant.product.name,
      variantName: st.variant.variant_name,
      label: st.label,
      sizes: st.sizes ?? [],
      thumbnailUrl,
      quantity: row.quantity,
      unitPricePaisa: unit,
      basePricePaisa: st.price_paisa,
      priceNote: note,
      warehouseStock: st.warehouse_stock,
      lineTotalPaisa: unit * row.quantity,
    });
  }

  const totalSets = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotalPaisa = lines.reduce((s, l) => s + l.lineTotalPaisa, 0);
  return { lines, totalSets, subtotalPaisa };
}

export async function cartItemCount(): Promise<number> {
  const shopkeeperId = await getCurrentShopkeeperId();
  if (!shopkeeperId) return 0;
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("shopkeeper_id", shopkeeperId);
  return (data ?? []).reduce((s, r) => s + (r.quantity as number), 0);
}
